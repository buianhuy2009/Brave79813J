/**
 * src/utils/icsExport.js
 * 
 * Generates RFC 5545 compliant iCalendar (.ics) match schedules for VEX IQ Level Up events.
 * 
 * Features:
 * - RFC 5545 strict CRLF line endings (\r\n)
 * - Safe line folding at 75 octets with multi-byte UTF-8 character boundary protection
 * - Standard RFC 5545 text escaping for backslashes, semicolons, commas, and newlines
 * - Strict UTC date formatting (YYYYMMDDTHHMMSSZ)
 * - Stable, deterministic UID generation
 * - Support for team-filtered schedules (identifies alliance partner) or full event schedules
 * - Client-side browser Blob & download trigger with automatic ObjectURL cleanup
 * - Pure generation logic decoupled from browser DOM for SSR/test safety
 */

/**
 * Format a Date or date string to RFC 5545 UTC timestamp format: YYYYMMDDTHHMMSSZ
 * @param {Date | string | number} date 
 * @returns {string | null}
 */
export function formatIcsDate(date) {
  if (!date) return null;
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return null;

  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape text for iCalendar properties per RFC 5545 Section 3.3.11
 * @param {string} str 
 * @returns {string}
 */
export function escapeIcsText(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n');
}

/**
 * Fold a line per RFC 5545 Section 3.1 (max 75 octets per line).
 * Continues on next line with CRLF followed by a single space (\r\n ).
 * Uses TextEncoder to respect UTF-8 octet boundaries.
 * 
 * @param {string} line 
 * @param {number} [maxOctets=75] 
 * @returns {string}
 */
export function foldLine(line, maxOctets = 75) {
  if (!line) return '';

  // Safe fallback if TextEncoder is not available
  if (typeof TextEncoder === 'undefined') {
    if (line.length <= maxOctets) return line;
    const chunks = [];
    chunks.push(line.slice(0, maxOctets));
    let idx = maxOctets;
    while (idx < line.length) {
      chunks.push(line.slice(idx, idx + maxOctets - 1));
      idx += maxOctets - 1;
    }
    return chunks.join('\r\n ');
  }

  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= maxOctets) {
    return line;
  }

  const chars = Array.from(line); // Preserves unicode code points
  let result = '';
  let currentLine = '';
  let currentBytes = 0;
  let isFirstLine = true;

  for (const char of chars) {
    const charBytes = encoder.encode(char).length;
    const limit = isFirstLine ? maxOctets : (maxOctets - 1); // 1 byte for continuation space

    if (currentBytes + charBytes > limit) {
      result += (result ? '\r\n ' : '') + currentLine;
      currentLine = char;
      currentBytes = charBytes;
      isFirstLine = false;
    } else {
      currentLine += char;
      currentBytes += charBytes;
    }
  }

  if (currentLine) {
    result += (result ? '\r\n ' : '') + currentLine;
  }

  return result;
}

/**
 * Extract all team numbers from a RobotEvents match object
 * @param {Object} match 
 * @returns {string[]} Uppercased team numbers
 */
export function extractTeamsFromMatch(match) {
  if (!match) return [];
  const teams = [];

  if (Array.isArray(match.alliances)) {
    for (const alliance of match.alliances) {
      if (Array.isArray(alliance.teams)) {
        for (const t of alliance.teams) {
          const teamObj = t.team || t;
          const num = teamObj?.number || teamObj?.code || teamObj?.name || (typeof teamObj === 'string' ? teamObj : null);
          if (num) teams.push(String(num).trim().toUpperCase());
        }
      }
    }
  } else if (Array.isArray(match.teams)) {
    for (const t of match.teams) {
      const num = t?.number || t?.code || t?.name || (typeof t === 'string' ? t : null);
      if (num) teams.push(String(num).trim().toUpperCase());
    }
  }

  return Array.from(new Set(teams));
}

/**
 * Format location string from event object
 * @param {Object} event 
 * @returns {string}
 */
export function formatLocation(event) {
  if (!event) return '';
  const loc = event.location || {};
  const parts = [
    loc.venue,
    loc.address_1,
    loc.city,
    loc.region,
    loc.country
  ].filter(p => p && String(p).trim() !== '');

  return parts.join(', ');
}

/**
 * Generate complete RFC 5545 iCalendar content in memory
 * 
 * @param {Object} event - RobotEvents event metadata
 * @param {Array<Object>} [matches=[]] - Match schedule list
 * @param {string} [teamNumber=null] - Optional team number filter (e.g. '79813J')
 * @param {Object} [options={}] - Options (e.g. matchDurationMinutes: 5)
 * @returns {string} Formatted .ics content with CRLF line endings
 */
export function generateEventIcs(event = {}, matches = [], teamNumber = null, options = {}) {
  const matchDurationMinutes = options.matchDurationMinutes || 5;
  const targetTeam = teamNumber ? String(teamNumber).trim().toUpperCase() : null;

  // Filter matches if target team is specified
  const eligibleMatches = Array.isArray(matches)
    ? matches.filter(match => {
        if (!targetTeam) return true;
        const matchTeams = extractTeamsFromMatch(match);
        return matchTeams.includes(targetTeam);
      })
    : [];

  const nowUtc = formatIcsDate(new Date()) || '20261026T000000Z';
  const eventName = event?.name || 'VEX IQ Level Up Event';
  const eventSku = event?.sku || 'RE-VIQRC';
  const locationStr = escapeIcsText(formatLocation(event));

  const calName = targetTeam
    ? `Matches: Team ${targetTeam} - ${eventName}`
    : `Schedule: ${eventName}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Level Up VEX IQ Calculator//Live Events Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
    'X-WR-TIMEZONE:UTC'
  ];

  let addedEventsCount = 0;

  for (let i = 0; i < eligibleMatches.length; i++) {
    const match = eligibleMatches[i];
    const scheduledTime = match.scheduled || match.started;
    if (!scheduledTime) continue;

    const dtStart = formatIcsDate(scheduledTime);
    if (!dtStart) continue;

    const startDate = new Date(scheduledTime);
    const endDate = new Date(startDate.getTime() + matchDurationMinutes * 60 * 1000);
    const dtEnd = formatIcsDate(endDate);

    const matchTeams = extractTeamsFromMatch(match);
    const matchName = match.name || `Match ${match.matchnum || (i + 1)}`;
    const divisionName = match.division?.name || event?.divisions?.find(d => d.id === match.division)?.name || '';
    const fieldName = match.field || '';

    // Alliance summary & partner identification
    let summary = '';
    let partnerText = '';

    if (targetTeam) {
      const partners = matchTeams.filter(t => t !== targetTeam);
      if (partners.length > 0) {
        partnerText = partners.join(', ');
        summary = `Match ${matchName}: ${targetTeam} w/ ${partnerText} - ${eventName}`;
      } else {
        summary = `Match ${matchName}: ${targetTeam} - ${eventName}`;
      }
    } else {
      if (matchTeams.length > 0) {
        summary = `Match ${matchName}: ${matchTeams.join(' & ')} - ${eventName}`;
      } else {
        summary = `Match ${matchName} - ${eventName}`;
      }
    }

    const descLines = [
      `Match: ${matchName}`,
      divisionName ? `Division: ${divisionName}` : null,
      fieldName ? `Field: ${fieldName}` : null,
      matchTeams.length > 0 ? `Alliance: ${matchTeams.join(' & ')}` : null,
      partnerText ? `Alliance Partner: ${partnerText}` : null,
      eventName ? `Event: ${eventName}` : null,
      eventSku ? `SKU: ${eventSku}` : null,
      'Live Tracker: https://brave79813j.vercel.app'
    ].filter(Boolean);

    const description = escapeIcsText(descLines.join('\n'));
    const uid = `vexiq-match-${eventSku}-${match.id || `m_${i}`}-${match.round || 0}-${match.matchnum || i}@levelup-vexiq`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DESCRIPTION:${description}`);
    if (locationStr) {
      lines.push(`LOCATION:${locationStr}`);
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
    addedEventsCount++;
  }

  // If no scheduled matches could be added (e.g. schedule not yet posted),
  // output a tournament-level event block so user gets the competition dates in calendar.
  if (addedEventsCount === 0 && (event?.start || event?.end)) {
    const startStr = formatIcsDate(event.start) || nowUtc;
    const endStr = formatIcsDate(event.end || event.start) || nowUtc;
    const uid = `vexiq-tournament-${eventSku}@levelup-vexiq`;

    const desc = [
      `Tournament: ${eventName}`,
      `SKU: ${eventSku}`,
      locationStr ? `Location: ${locationStr}` : null,
      'Live Tracker: https://brave79813j.vercel.app'
    ].filter(Boolean).join('\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowUtc}`);
    lines.push(`DTSTART:${startStr}`);
    lines.push(`DTEND:${endStr}`);
    lines.push(`SUMMARY:${escapeIcsText(eventName)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(desc)}`);
    if (locationStr) {
      lines.push(`LOCATION:${locationStr}`);
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // Apply RFC 5545 line folding and CRLF endings
  return lines.map(line => foldLine(line, 75)).join('\r\n') + '\r\n';
}

/**
 * Trigger client-side browser file download of .ics content
 * @param {string} icsContent 
 * @param {string} [filename='schedule.ics'] 
 * @returns {boolean}
 */
export function downloadIcsFile(icsContent, filename = 'schedule.ics') {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  try {
    const cleanFilename = filename.endsWith('.ics') ? filename : `${filename}.ics`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = (typeof URL !== 'undefined' && URL.createObjectURL)
      ? URL.createObjectURL(blob)
      : null;

    if (!url) return false;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', cleanFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke object URL after delay
    setTimeout(() => {
      try {
        if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
          URL.revokeObjectURL(url);
        }
      } catch (e) {
        // ignore
      }
    }, 1000);

    return true;
  } catch (err) {
    console.error('[icsExport] Error downloading .ics file:', err);
    return false;
  }
}

/**
 * Coordinate generation and download of event schedule calendar
 * @param {Object} event - Event metadata
 * @param {Array<Object>} matches - Matches list
 * @param {string} [teamNumber=null] - Optional team filter (e.g. '79813J')
 * @param {Object} [options={}] - Optional config
 * @returns {boolean}
 */
export function exportEventCalendar(event, matches = [], teamNumber = null, options = {}) {
  const icsContent = generateEventIcs(event, matches, teamNumber, options);
  if (!icsContent) return false;

  const skuPart = (event?.sku || 'vexiq_event').replace(/[^a-zA-Z0-9_-]/g, '_');
  const teamPart = teamNumber ? `_team_${String(teamNumber).trim().toUpperCase()}` : '';
  const filename = `${skuPart}${teamPart}_schedule.ics`;

  return downloadIcsFile(icsContent, filename);
}
