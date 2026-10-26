/**
 * src/utils/opr.js - VIQRC Cooperative Mean OPR (Offensive Power Rating) Engine
 * 
 * Implements regularized least-squares OPR calculation for VIQRC 2-team collaborative matches.
 * Normal equation formulation: (A^T A + lambda * I) * x = A^T * b
 * Solved via Gaussian elimination with partial pivoting in pure JS (zero external math dependencies).
 * 
 * Features:
 * - Robust schema parsing: RobotEvents API v2 nested alliance objects & flat match fixtures
 * - Regularization: lambda * I ensures bounded, unique solution on singular or disconnected alliance graphs
 * - Handles empty match sets, unplayed teams, solo alliances, and 0-score matches
 * - Guaranteed numerical stability: Zero NaNs, zero Infinities
 */

/**
 * Solves a square linear system A * x = b using Gaussian elimination with partial pivoting.
 * @param {Array<Array<number>|Float64Array>} A - n x n coefficient matrix
 * @param {Array<number>|Float64Array} b - n-dimensional right-hand side vector
 * @returns {Array<number>} n-dimensional solution vector x
 */
export function solveLinearSystem(A, b) {
  const n = A.length;
  if (n === 0) return [];
  if (b.length !== n) {
    throw new Error(`Dimension mismatch: matrix is ${n}x${n} but vector has length ${b.length}`);
  }

  // Create augmented matrix [A | b] using Float64Array for performance & precision
  const M = new Array(n);
  for (let i = 0; i < n; i++) {
    M[i] = new Float64Array(n + 1);
    for (let j = 0; j < n; j++) {
      M[i][j] = A[i][j];
    }
    M[i][n] = b[i];
  }

  // Forward elimination with partial pivoting
  for (let k = 0; k < n; k++) {
    // Locate row with maximum pivot element in column k
    let maxRow = k;
    let maxVal = Math.abs(M[k][k]);
    for (let i = k + 1; i < n; i++) {
      const absVal = Math.abs(M[i][k]);
      if (absVal > maxVal) {
        maxVal = absVal;
        maxRow = i;
      }
    }

    // Row swap
    if (maxRow !== k) {
      const temp = M[k];
      M[k] = M[maxRow];
      M[maxRow] = temp;
    }

    const pivot = M[k][k];
    if (Math.abs(pivot) < 1e-12) {
      // Degenerate/singular column: cannot eliminate below, proceed to next
      continue;
    }

    // Eliminate below pivot
    for (let i = k + 1; i < n; i++) {
      const factor = M[i][k] / pivot;
      M[i][k] = 0;
      for (let j = k + 1; j <= n; j++) {
        M[i][j] -= factor * M[k][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    const pivot = M[i][i];
    if (Math.abs(pivot) < 1e-12) {
      // Indeterminate variable in singular subsystem falls back to 0
      x[i] = 0;
    } else {
      const val = sum / pivot;
      x[i] = Number.isFinite(val) ? val : 0;
    }
  }

  return x;
}

/**
 * Normalizes any team representation (string, number, or object) to a clean team string key.
 * @param {string|number|Object} team 
 * @returns {string|null}
 */
export function normalizeTeamKey(team) {
  if (team == null) return null;
  if (typeof team === 'string' || typeof team === 'number') {
    const trimmed = String(team).trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof team === 'object') {
    if (team.number != null) return String(team.number).trim();
    if (team.name != null) return String(team.name).trim();
    if (team.code != null) return String(team.code).trim();
    if (team.team_name != null) return String(team.team_name).trim();
    if (team.id != null) return String(team.id).trim();
  }
  return null;
}

/**
 * Extracts scored status, match score, and participating team keys from a match object.
 * Supports both RobotEvents API v2 nested alliances and simplified test fixtures.
 * @param {Object} match 
 * @returns {{ isScored: boolean, score: number, teamKeys: string[] } | null}
 */
export function parseMatch(match) {
  if (!match || typeof match !== 'object') return null;

  let isScored = false;
  let score = 0;
  let teamKeys = [];

  // Schema 1: Direct teams array (e.g., { teams: ['79813J', '12345A'], score: 60, scored: true })
  if (Array.isArray(match.teams)) {
    teamKeys = match.teams
      .map(t => {
        if (t && typeof t === 'object' && t.team) return normalizeTeamKey(t.team);
        return normalizeTeamKey(t);
      })
      .filter(Boolean);

    score = typeof match.score === 'number' ? match.score : 0;
    isScored = match.scored !== undefined 
      ? Boolean(match.scored) 
      : (score > 0 || match.status === 'scored' || match.status === 'completed');
  } 
  // Schema 2: RobotEvents API v2 alliances array
  else if (Array.isArray(match.alliances) && match.alliances.length > 0) {
    for (const alliance of match.alliances) {
      if (!alliance) continue;
      const allianceScore = typeof alliance.score === 'number' ? alliance.score : 0;
      const allianceTeams = Array.isArray(alliance.teams)
        ? alliance.teams
            .map(t => {
              if (t && typeof t === 'object' && t.team) return normalizeTeamKey(t.team);
              return normalizeTeamKey(t);
            })
            .filter(Boolean)
        : [];

      if (allianceTeams.length > 0) {
        teamKeys.push(...allianceTeams);
        score = allianceScore;
      }
    }

    if (match.scored !== undefined) {
      isScored = Boolean(match.scored);
    } else if (match.status) {
      isScored = match.status === 'scored' || match.status === 'completed';
    } else {
      isScored = typeof score === 'number' && score >= 0;
    }
  }

  // Deduplicate teams within the match
  teamKeys = Array.from(new Set(teamKeys));

  return { isScored, score, teamKeys };
}

/**
 * Helper to round a floating point number to a given number of decimal places.
 * @param {number} num 
 * @param {number|null} [decimals=1] 
 * @returns {number}
 */
export function roundTo(num, decimals = 1) {
  if (num == null || Number.isNaN(num) || !Number.isFinite(num)) return 0;
  if (decimals == null) return num;
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates Cooperative Mean Offensive Power Rating (OPR) for VIQRC teamwork challenge matches.
 * 
 * Formulation: (A^T A + lambda * I) * x = A^T * b
 * 
 * @param {Array<string|number|Object>} [teams=[]] - List of registered teams (objects or identifiers)
 * @param {Array<Object>} [matches=[]] - List of matches (RobotEvents or fixture format)
 * @param {number|Object} [options=1e-4] - Regularization parameter lambda (default 1e-4) or options object
 * @param {number} [options.lambda=1e-4] - Ridge regularization parameter
 * @param {number|null} [options.decimals=1] - Decimal precision to round result (default 1, null for raw)
 * @returns {Record<string, number>} Map of team identifier -> OPR value
 */
export function calculateOPR(teams = [], matches = [], options = {}) {
  let lambda = 1e-4;
  let decimals = 1;

  if (typeof options === 'number') {
    lambda = options;
  } else if (typeof options === 'object' && options !== null) {
    if (options.lambda !== undefined) lambda = options.lambda;
    if (options.decimals !== undefined) decimals = options.decimals;
  }

  // 1. Collect all declared team keys
  const teamKeySet = new Set();
  if (Array.isArray(teams)) {
    for (const t of teams) {
      const key = normalizeTeamKey(t);
      if (key) teamKeySet.add(key);
    }
  }

  // 2. Parse matches and collect any additional teams from match records
  const parsedMatches = [];
  if (Array.isArray(matches)) {
    for (const m of matches) {
      const parsed = parseMatch(m);
      if (parsed && parsed.isScored && parsed.teamKeys.length > 0) {
        parsedMatches.push(parsed);
        for (const k of parsed.teamKeys) {
          teamKeySet.add(k);
        }
      }
    }
  }

  const teamList = Array.from(teamKeySet).sort();
  const n = teamList.length;
  if (n === 0) return {};

  const teamIndex = new Map();
  teamList.forEach((k, i) => teamIndex.set(k, i));

  // 3. Construct normal equations (A^T A + lambda * I) * x = A^T * b
  // G is n x n, y is n x 1
  const G = Array.from({ length: n }, () => new Float64Array(n));
  const y = new Float64Array(n);

  for (const match of parsedMatches) {
    const { score, teamKeys } = match;
    for (const t1 of teamKeys) {
      const i = teamIndex.get(t1);
      if (i === undefined) continue;
      y[i] += score;
      for (const t2 of teamKeys) {
        const j = teamIndex.get(t2);
        if (j === undefined) continue;
        G[i][j] += 1;
      }
    }
  }

  // Apply ridge regularization lambda to the diagonal
  for (let i = 0; i < n; i++) {
    G[i][i] += lambda;
  }

  // 4. Solve the linear system
  const x = solveLinearSystem(G, y);

  // 5. Construct mapped result
  const result = {};
  for (let i = 0; i < n; i++) {
    const rawVal = x[i];
    result[teamList[i]] = decimals != null ? roundTo(rawVal, decimals) : rawVal;
  }

  return result;
}

/**
 * Computes arithmetic mean score across all scored matches.
 * @param {Array<Object>} matches 
 * @returns {number}
 */
export function calculateMeanScore(matches = []) {
  if (!Array.isArray(matches) || matches.length === 0) return 0;
  let totalScore = 0;
  let count = 0;
  for (const m of matches) {
    const parsed = parseMatch(m);
    if (parsed && parsed.isScored) {
      totalScore += parsed.score;
      count++;
    }
  }
  return count > 0 ? totalScore / count : 0;
}

/**
 * Computes arithmetic mean across an OPR result mapping.
 * @param {Record<string, number>} oprMap 
 * @returns {number}
 */
export function calculateMeanOPR(oprMap = {}) {
  if (!oprMap || typeof oprMap !== 'object') return 0;
  const values = Object.values(oprMap);
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + (typeof val === 'number' && Number.isFinite(val) ? val : 0), 0);
  return sum / values.length;
}
