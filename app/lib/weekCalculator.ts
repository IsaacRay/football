// Calculate current NFL week based on date
// Week 1 shows until Tuesday Sept 9th (day after Monday Night Football)
// Each new week shows starting the following Tuesday

export function getCurrentNFLWeek(): number {
  const now = new Date();
  
  // NFL 2025 season starts September 4, 2025 (Thursday)
  // Week 1 runs until Tuesday September 9, 2025
  // All times in EST for consistency
  const season2025Start = new Date('2025-09-04T00:00:00-05:00');
  
  // If before season start, return week 1
  if (now < season2025Start) {
    return 1;
  }
  
  // Calculate weeks since season start
  // Each week transitions on Tuesday (day after Monday Night Football)
  const weekStartDates = [
    new Date('2025-09-04T00:00:00-05:00'), // Week 1: Thu Sep 4
    new Date('2025-09-09T00:01:00-05:00'), // Week 2: Tue Sep 9 at 12:01 AM
    new Date('2025-09-16T00:01:00-05:00'), // Week 3: Tue Sep 16 at 12:01 AM
    new Date('2025-09-23T00:01:00-05:00'), // Week 4: Tue Sep 23 at 12:01 AM
    new Date('2025-09-30T00:01:00-05:00'), // Week 5: Tue Sep 30 at 12:01 AM
    new Date('2025-10-07T00:01:00-05:00'), // Week 6: Tue Oct 7 at 12:01 AM
    new Date('2025-10-14T00:01:00-05:00'), // Week 7: Tue Oct 14 at 12:01 AM
    new Date('2025-10-21T00:01:00-05:00'), // Week 8: Tue Oct 21 at 12:01 AM
    new Date('2025-10-28T00:01:00-05:00'), // Week 9: Tue Oct 28 at 12:01 AM
    new Date('2025-11-04T00:01:00-05:00'), // Week 10: Tue Nov 4 at 12:01 AM
    new Date('2025-11-11T00:01:00-05:00'), // Week 11: Tue Nov 11 at 12:01 AM
    new Date('2025-11-18T00:01:00-05:00'), // Week 12: Tue Nov 18 at 12:01 AM
    new Date('2025-11-25T00:01:00-05:00'), // Week 13: Tue Nov 25 at 12:01 AM
    new Date('2025-12-02T00:01:00-05:00'), // Week 14: Tue Dec 2 at 12:01 AM
    new Date('2025-12-09T00:01:00-05:00'), // Week 15: Tue Dec 9 at 12:01 AM
    new Date('2025-12-16T00:01:00-05:00'), // Week 16: Tue Dec 16 at 12:01 AM
    new Date('2025-12-23T00:01:00-05:00'), // Week 17: Tue Dec 23 at 12:01 AM
    new Date('2025-12-30T00:01:00-05:00'), // Week 18: Tue Dec 30 at 12:01 AM
  ];
  
  // Find the current week by checking which week start we've passed
  for (let i = weekStartDates.length - 1; i >= 0; i--) {
    if (now >= weekStartDates[i]) {
      return i + 1;
    }
  }
  
  // Default to week 1 if something goes wrong
  return 1;
}

export function getWeekDateRange(week: number): { start: Date; end: Date } {
  const weekStarts = [
    new Date('2025-09-04'), // Week 1
    new Date('2025-09-09'), // Week 2
    new Date('2025-09-16'), // Week 3
    new Date('2025-09-23'), // Week 4
    new Date('2025-09-30'), // Week 5
    new Date('2025-10-07'), // Week 6
    new Date('2025-10-14'), // Week 7
    new Date('2025-10-21'), // Week 8
    new Date('2025-10-28'), // Week 9
    new Date('2025-11-04'), // Week 10
    new Date('2025-11-11'), // Week 11
    new Date('2025-11-18'), // Week 12
    new Date('2025-11-25'), // Week 13
    new Date('2025-12-02'), // Week 14
    new Date('2025-12-09'), // Week 15
    new Date('2025-12-16'), // Week 16
    new Date('2025-12-23'), // Week 17
    new Date('2025-12-30'), // Week 18
  ];
  
  const start = weekStarts[week - 1] || weekStarts[0];
  const end = weekStarts[week] || new Date('2026-01-05');
  
  return { start, end };
}