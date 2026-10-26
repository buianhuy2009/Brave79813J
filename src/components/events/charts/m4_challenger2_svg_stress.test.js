import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SkillsBar from './SkillsBar';
import RadarChart from './RadarChart';
import TrendChart from './TrendChart';

/**
 * m4_challenger2_svg_stress.test.js
 * 
 * Milestone M4 Empirical Challenger 2 Stress Test Suite:
 * 1. Zero, negative, extreme values (10000+), null/undefined inputs, and single-point match arrays.
 * 2. Assert ZERO NaN or Infinity in all SVG attributes (d, points, x, y, width, height, cx, cy, x1, y1, x2, y2).
 * 3. Test multiple chart instances on the same page for SVG ID collision resistance.
 * 4. Empirical verification and reproduction of edge case vulnerabilities.
 */

// Helper: Extracts all SVG attribute values across the rendered markup and asserts no NaN or Infinity
function assertZeroNaNOrInfinityInSvg(html, context = '') {
  // Regex to extract all attribute values: attr="value"
  const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
  let match;
  const inspectedAttrs = ['d', 'points', 'x', 'y', 'width', 'height', 'cx', 'cy', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'viewBox'];

  while ((match = attrRegex.exec(html)) !== null) {
    const [, attrName, attrValue] = match;

    if (inspectedAttrs.includes(attrName)) {
      expect(attrValue, `Attribute ${attrName} in ${context} should not contain NaN. Value: "${attrValue}"`)
        .not.toContain('NaN');
      expect(attrValue, `Attribute ${attrName} in ${context} should not contain Infinity. Value: "${attrValue}"`)
        .not.toContain('Infinity');
    }
  }

  // Also assert that the entire HTML string does not contain raw NaN or Infinity in numeric contexts
  expect(html, `HTML in ${context} should not contain "NaN"`).not.toContain('NaN');
  expect(html, `HTML in ${context} should not contain "Infinity"`).not.toContain('Infinity');
}

// Helper: Extracts all element IDs defined in SVG <defs> or anywhere in the markup
function extractAllIds(html) {
  const idRegex = /\sid="([^"]+)"/g;
  const ids = [];
  let match;
  while ((match = idRegex.exec(html)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

describe('Milestone M4 Challenger 2: SVG Stress & Build Integrity Test Suite', () => {

  // ==========================================================================
  // SUITE 1: SkillsBar Stress Testing
  // ==========================================================================
  describe('SkillsBar Mathematical & SVG Attribute Verification', () => {
    
    it('1.1 Zero scores: driverScore=0, programmingScore=0, totalScore=0', () => {
      const html = renderToStaticMarkup(
        React.createElement(SkillsBar, { driverScore: 0, programmingScore: 0, totalScore: 0 })
      );
      assertZeroNaNOrInfinityInSvg(html, 'SkillsBar zero scores');
      expect(html).toContain('No skills recorded');
      expect(html).toContain('width="400"');
    });

    it('1.2 Negative scores: driverScore=-50, programmingScore=-100 (clamped safely)', () => {
      const html = renderToStaticMarkup(
        React.createElement(SkillsBar, { driverScore: -50, programmingScore: -100 })
      );
      assertZeroNaNOrInfinityInSvg(html, 'SkillsBar negative scores');
      expect(html).toContain('No skills recorded');
      // Driver and programming should clamp to 0
      expect(html).toContain('Driver: <strong class="font-mono text-slate-900 dark:text-white">0</strong>');
      expect(html).toContain('Programming: <strong class="font-mono text-slate-900 dark:text-white">0</strong>');
    });

    it('1.3 Extreme scores (10000+): driverScore=15000, programmingScore=35000', () => {
      const html = renderToStaticMarkup(
        React.createElement(SkillsBar, { driverScore: 15000, programmingScore: 35000, totalScore: 50000 })
      );
      assertZeroNaNOrInfinityInSvg(html, 'SkillsBar extreme scores 50,000');
      expect(html).toContain('50000');
      expect(html).toContain('30%'); // 15000/50000
      expect(html).toContain('70%'); // 35000/50000
      // 30% of 400 is 120, 70% of 400 is 280
      expect(html).toContain('width="120"');
      expect(html).toContain('width="280"');
      expect(html).toContain('x="120"');
    });

    it('1.4 Super-extreme scores: driverScore=1e7, programmingScore=2e7', () => {
      const html = renderToStaticMarkup(
        React.createElement(SkillsBar, { driverScore: 10000000, programmingScore: 20000000 })
      );
      assertZeroNaNOrInfinityInSvg(html, 'SkillsBar super-extreme scores');
      expect(html).toContain('30000000');
      expect(html).toContain('33%');
      expect(html).toContain('67%');
    });

    it('1.5 Null and undefined inputs for all score props', () => {
      const html = renderToStaticMarkup(
        React.createElement(SkillsBar, { 
          driverScore: null, 
          programmingScore: undefined, 
          totalScore: null, 
          maxScore: undefined 
        })
      );
      assertZeroNaNOrInfinityInSvg(html, 'SkillsBar null/undefined inputs');
      expect(html).toContain('No skills recorded');
    });

    it('1.6 Compact mode with zero, negative, and extreme scores', () => {
      const htmlCompactZero = renderToStaticMarkup(
        React.createElement(SkillsBar, { driverScore: 0, programmingScore: 0, compact: true })
      );
      assertZeroNaNOrInfinityInSvg(htmlCompactZero, 'SkillsBar compact zero');
      expect(htmlCompactZero).toContain('viewBox="0 0 400 10"');

      const htmlCompactNegative = renderToStaticMarkup(
        React.createElement(SkillsBar, { driverScore: -10, programmingScore: -20, compact: true })
      );
      assertZeroNaNOrInfinityInSvg(htmlCompactNegative, 'SkillsBar compact negative');

      const htmlCompactExtreme = renderToStaticMarkup(
        React.createElement(SkillsBar, { driverScore: 25000, programmingScore: 75000, compact: true })
      );
      assertZeroNaNOrInfinityInSvg(htmlCompactExtreme, 'SkillsBar compact extreme');
      expect(htmlCompactExtreme).toContain('100000');
    });

    it('1.7 Floating point / decimal scores: driverScore=45.6, programmingScore=54.4', () => {
      const html = renderToStaticMarkup(
        React.createElement(SkillsBar, { driverScore: 45.6, programmingScore: 54.4 })
      );
      assertZeroNaNOrInfinityInSvg(html, 'SkillsBar floating point scores');
      expect(html).toContain('100');
      expect(html).toContain('46%');
      expect(html).toContain('54%');
    });

    it('1.8 Multiple SkillsBar instances on same page: unique clipPath & linearGradient IDs', () => {
      const htmlMultiple = renderToStaticMarkup(
        React.createElement('div', null,
          React.createElement(SkillsBar, { driverScore: 50, programmingScore: 50 }),
          React.createElement(SkillsBar, { driverScore: 60, programmingScore: 40 }),
          React.createElement(SkillsBar, { driverScore: 70, programmingScore: 30, compact: true })
        )
      );

      assertZeroNaNOrInfinityInSvg(htmlMultiple, 'Multiple SkillsBar instances');
      const ids = extractAllIds(htmlMultiple);
      expect(ids.length).toBeGreaterThan(0);

      // Verify ZERO duplicate IDs across all instances
      const idSet = new Set(ids);
      expect(idSet.size).toBe(ids.length);
    });
  });

  // ==========================================================================
  // SUITE 2: RadarChart Stress Testing
  // ==========================================================================
  describe('RadarChart Trigonometric & Hexagonal Geometry Verification', () => {

    it('2.1 Zero metrics: all 6 metrics at 0 (clamped to 6% minimum radius)', () => {
      const zeroMetrics = { avgScore: 0, maxScore: 0, opr: 0, skillsScore: 0, autoRatio: 0, winRate: 0 };
      const html = renderToStaticMarkup(
        React.createElement(RadarChart, {
          teamMetrics: zeroMetrics,
          medianMetrics: zeroMetrics,
          teamNumber: '79813J'
        })
      );
      assertZeroNaNOrInfinityInSvg(html, 'RadarChart zero metrics');

      // Verify points attribute on team polygon
      const pointsMatch = html.match(/points="([^"]+)"\s+class="fill-cyan-500\/25/);
      expect(pointsMatch).not.toBeNull();
      const points = pointsMatch[1].split(' ');
      expect(points.length).toBe(6);

      // All 6 points must be strictly finite numeric pairs within 340x340 viewBox
      points.forEach(pt => {
        const [x, y] = pt.split(',').map(Number);
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(340);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(340);
      });
    });

    it('2.2 Negative metrics: all 6 metrics negative (clamped to non-negative 6%)', () => {
      const negMetrics = { avgScore: -50, maxScore: -100, opr: -30, skillsScore: -40, autoRatio: -20, winRate: -15 };
      const html = renderToStaticMarkup(
        React.createElement(RadarChart, {
          teamMetrics: negMetrics,
          medianMetrics: negMetrics,
          teamNumber: '79813J'
        })
      );
      assertZeroNaNOrInfinityInSvg(html, 'RadarChart negative metrics');
    });

    it('2.3 Extreme metrics (10000+): values exceed defaultMax by 100x (clamped to 100% boundary)', () => {
      const extremeMetrics = {
        avgScore: 12000,
        maxScore: 25000,
        opr: 10000,
        skillsScore: 99999,
        autoRatio: 500,
        winRate: 1000
      };
      const html = renderToStaticMarkup(
        React.createElement(RadarChart, {
          teamMetrics: extremeMetrics,
          medianMetrics: { avgScore: 5000 },
          teamNumber: '79813J'
        })
      );
      assertZeroNaNOrInfinityInSvg(html, 'RadarChart extreme metrics (10000+)');

      // Clamped vertices should not exceed radius R=105 from center (170, 170)
      const pointsMatch = html.match(/points="([^"]+)"\s+class="fill-cyan-500\/25/);
      expect(pointsMatch).not.toBeNull();
      const points = pointsMatch[1].split(' ');
      points.forEach(pt => {
        const [x, y] = pt.split(',').map(Number);
        const distFromCenter = Math.hypot(x - 170, y - 170);
        expect(distFromCenter).toBeLessThanOrEqual(105.1); // within rounding margin
      });
    });

    it('2.4 Undefined and empty objects for teamMetrics and medianMetrics', () => {
      const htmlEmpty = renderToStaticMarkup(
        React.createElement(RadarChart, { teamMetrics: {}, medianMetrics: {} })
      );
      assertZeroNaNOrInfinityInSvg(htmlEmpty, 'RadarChart empty objects');

      const htmlUndefined = renderToStaticMarkup(
        React.createElement(RadarChart, { teamMetrics: undefined, medianMetrics: undefined })
      );
      assertZeroNaNOrInfinityInSvg(htmlUndefined, 'RadarChart undefined objects');
    });

    it('2.5 Vulnerability Reproduction: RadarChart throws TypeError when teamMetrics or medianMetrics is null', () => {
      // In RadarChart.jsx line 18: `teamMetrics = {}` only defaults when undefined, NOT when null.
      // Lines 57 & 71 access `teamMetrics[axis.key]` directly.
      // Passing null crashes with TypeError: Cannot read properties of null (reading 'avgScore').
      expect(() => {
        renderToStaticMarkup(
          React.createElement(RadarChart, { teamMetrics: null })
        );
      }).toThrow(TypeError);

      expect(() => {
        renderToStaticMarkup(
          React.createElement(RadarChart, { medianMetrics: null })
        );
      }).toThrow(TypeError);
    });

    it('2.6 Multiple RadarChart instances on same page: zero ID collisions', () => {
      const htmlMultiple = renderToStaticMarkup(
        React.createElement('div', null,
          React.createElement(RadarChart, { teamNumber: '79813J' }),
          React.createElement(RadarChart, { teamNumber: '12345A' }),
          React.createElement(RadarChart, { teamNumber: '99999Z' })
        )
      );
      assertZeroNaNOrInfinityInSvg(htmlMultiple, 'Multiple RadarChart instances');
      const ids = extractAllIds(htmlMultiple);
      const idSet = new Set(ids);
      expect(idSet.size).toBe(ids.length);
    });
  });

  // ==========================================================================
  // SUITE 3: TrendChart Stress Testing
  // ==========================================================================
  describe('TrendChart Monotonic Cubic Spline & Geometry Verification', () => {

    it('3.1 Zero match scores: [{ score: 0 }, { score: 0 }]', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrendChart, {
          data: [{ label: 'Q1', score: 0 }, { label: 'Q2', score: 0 }]
        })
      );
      assertZeroNaNOrInfinityInSvg(html, 'TrendChart zero match scores');
      expect(html).toContain('Avg: 0.0');
    });

    it('3.2 Negative match scores: scores below zero', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrendChart, {
          data: [
            { label: 'Q1', score: -20 },
            { label: 'Q2', score: -5 },
            { label: 'Q3', score: -35 }
          ]
        })
      );
      assertZeroNaNOrInfinityInSvg(html, 'TrendChart negative match scores');
      expect(html).toContain('path');
    });

    it('3.3 Extreme match scores (10000+): scores up to 50,000', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrendChart, {
          data: [
            { label: 'Q1', score: 12500 },
            { label: 'Q2', score: 48000 },
            { label: 'Q3', score: 32000 }
          ]
        })
      );
      assertZeroNaNOrInfinityInSvg(html, 'TrendChart extreme match scores 50,000');
      expect(html).toContain('Avg: 30833.3');
    });

    it('3.4 Null, undefined, and non-numeric score fields in match objects', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrendChart, {
          data: [
            { label: 'Q1', score: null },
            { label: 'Q2', score: undefined },
            { label: 'Q3', score: 'not_a_number' },
            { label: 'Q4' }
          ]
        })
      );
      assertZeroNaNOrInfinityInSvg(html, 'TrendChart null/undefined scores');
      expect(html).toContain('Avg: 0.0');
    });

    it('3.5 Single-point match array: single standard match [{ score: 75, label: "Q1" }]', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrendChart, {
          data: [{ label: 'Q1', score: 75, partner: '79813J' }]
        })
      );
      assertZeroNaNOrInfinityInSvg(html, 'TrendChart single-point match array');
      expect(html).toContain('Q1');
      expect(html).toContain('Avg: 75.0');
      // For a single point, the multi-point path spline is intentionally not rendered
      expect(html).toContain('circle');
      // The single circle should be centered at plot midpoint
      expect(html).toContain('cx="255.0"');
    });

    it('3.6 Single-point match array: zero, negative, and extreme scores', () => {
      const htmlZero = renderToStaticMarkup(
        React.createElement(TrendChart, { data: [{ score: 0 }] })
      );
      assertZeroNaNOrInfinityInSvg(htmlZero, 'TrendChart single zero');

      const htmlNeg = renderToStaticMarkup(
        React.createElement(TrendChart, { data: [{ score: -45 }] })
      );
      assertZeroNaNOrInfinityInSvg(htmlNeg, 'TrendChart single negative');

      const htmlExt = renderToStaticMarkup(
        React.createElement(TrendChart, { data: [{ score: 99999 }] })
      );
      assertZeroNaNOrInfinityInSvg(htmlExt, 'TrendChart single extreme 99,999');
      expect(htmlExt).toContain('Avg: 99999.0');
    });

    it('3.7 Flatline scores: all matches have identical score (prevents division by zero in yRange)', () => {
      const html = renderToStaticMarkup(
        React.createElement(TrendChart, {
          data: [
            { label: 'Q1', score: 80 },
            { label: 'Q2', score: 80 },
            { label: 'Q3', score: 80 },
            { label: 'Q4', score: 80 }
          ]
        })
      );
      assertZeroNaNOrInfinityInSvg(html, 'TrendChart flatline identical scores');
      expect(html).toContain('Avg: 80.0');
      expect(html).toContain('path');
    });

    it('3.8 Empty array and null/undefined data props: renders calm empty state fallback', () => {
      const htmlEmpty = renderToStaticMarkup(
        React.createElement(TrendChart, { data: [] })
      );
      expect(htmlEmpty).toContain('No match data recorded yet');

      const htmlNull = renderToStaticMarkup(
        React.createElement(TrendChart, { data: null })
      );
      expect(htmlNull).toContain('No match data recorded yet');

      const htmlUndefined = renderToStaticMarkup(
        React.createElement(TrendChart, { data: undefined })
      );
      expect(htmlUndefined).toContain('No match data recorded yet');
    });

    it('3.9 Alternating extreme spikes across 10 matches', () => {
      const dataSpikes = [
        { label: 'Q1', score: 0 },
        { label: 'Q2', score: 15000 },
        { label: 'Q3', score: 10 },
        { label: 'Q4', score: 20000 },
        { label: 'Q5', score: 5 },
        { label: 'Q6', score: 35000 },
        { label: 'Q7', score: 100 },
        { label: 'Q8', score: 50000 },
        { label: 'Q9', score: 0 },
        { label: 'Q10', score: 45000 }
      ];
      const html = renderToStaticMarkup(
        React.createElement(TrendChart, { data: dataSpikes })
      );
      assertZeroNaNOrInfinityInSvg(html, 'TrendChart alternating extreme spikes');
      expect(html).toContain('Q10');
    });
  });

  // ==========================================================================
  // SUITE 4: Multi-Component Composite Dashboard & SVG ID Isolation
  // ==========================================================================
  describe('Multi-Chart Composite Dashboard & SVG ID Isolation', () => {

    it('4.1 Composite page with SkillsBar, RadarChart, and TrendChart simultaneously: ZERO NaN or Infinity', () => {
      const composite = renderToStaticMarkup(
        React.createElement('div', { className: 'dashboard-container' },
          // 3 SkillsBar instances
          React.createElement(SkillsBar, { driverScore: 45, programmingScore: 55 }),
          React.createElement(SkillsBar, { driverScore: 80, programmingScore: 20, compact: true }),
          React.createElement(SkillsBar, { driverScore: 0, programmingScore: 0 }),
          // 2 RadarChart instances
          React.createElement(RadarChart, { teamNumber: '79813J', teamMetrics: { avgScore: 85 } }),
          React.createElement(RadarChart, { teamNumber: '12345A', teamMetrics: { avgScore: 92 } }),
          // 1 TrendChart instance
          React.createElement(TrendChart, {
            data: [
              { label: 'Q1', score: 60 },
              { label: 'Q2', score: 75 },
              { label: 'Q3', score: 90 }
            ]
          })
        )
      );

      assertZeroNaNOrInfinityInSvg(composite, 'Composite multi-chart dashboard');
      expect(composite).toContain('79813J');
      expect(composite).toContain('12345A');
      expect(composite).toContain('Q3');
    });

    it('4.2 Multi-instance SVG ID isolation: SkillsBar dynamically prefixes IDs avoiding namespace collision', () => {
      const html = renderToStaticMarkup(
        React.createElement('div', null,
          React.createElement(SkillsBar, { driverScore: 50, programmingScore: 50 }),
          React.createElement(SkillsBar, { driverScore: 60, programmingScore: 40 }),
          React.createElement(TrendChart, {
            data: [{ label: 'Q1', score: 50 }, { label: 'Q2', score: 80 }]
          })
        )
      );

      const ids = extractAllIds(html);
      // SkillsBar IDs (skills-clip-*) must never collide with TrendChart ID (trendAreaGrad)
      const trendIdCount = ids.filter(id => id === 'trendAreaGrad').length;
      expect(trendIdCount).toBe(1);

      const skillsClipIds = ids.filter(id => id.startsWith('skills-clip-'));
      const skillsClipIdSet = new Set(skillsClipIds);
      expect(skillsClipIdSet.size).toBe(skillsClipIds.length);
    });

    it('4.3 Vulnerability Reproduction: Multiple TrendChart instances duplicate id="trendAreaGrad"', () => {
      const html = renderToStaticMarkup(
        React.createElement('div', null,
          React.createElement(TrendChart, { data: [{ label: 'Q1', score: 50 }, { label: 'Q2', score: 60 }] }),
          React.createElement(TrendChart, { data: [{ label: 'Q1', score: 70 }, { label: 'Q2', score: 80 }] })
        )
      );
      const ids = extractAllIds(html);
      const trendAreaGradOccurrences = ids.filter(id => id === 'trendAreaGrad').length;
      // Empirically demonstrates duplicate ID collision in DOM:
      // TrendChart lines 104 & 162 hardcodes static `trendAreaGrad` rather than using `useId()`.
      // Result: 2 elements share the identical ID `trendAreaGrad`.
      expect(trendAreaGradOccurrences).toBe(2);
    });

    it('4.4 Verifies gradient reference syntax url(#id) matches declared <defs> elements', () => {
      const html = renderToStaticMarkup(
        React.createElement('div', null,
          React.createElement(SkillsBar, { driverScore: 60, programmingScore: 40 }),
          React.createElement(TrendChart, {
            data: [{ label: 'Q1', score: 60 }, { label: 'Q2', score: 85 }]
          })
        )
      );

      // Extract all url(#...) references
      const urlRegex = /url\(#([^)]+)\)/g;
      let urlMatch;
      const referencedIds = [];
      while ((urlMatch = urlRegex.exec(html)) !== null) {
        referencedIds.push(urlMatch[1]);
      }

      expect(referencedIds.length).toBeGreaterThan(0);

      // Extract all declared IDs in DOM
      const declaredIds = new Set(extractAllIds(html));

      // Every referenced ID must exist in declared IDs
      referencedIds.forEach(refId => {
        expect(declaredIds.has(refId), `Referenced ID "${refId}" must be declared in <defs>`).toBe(true);
      });
    });
  });

});
