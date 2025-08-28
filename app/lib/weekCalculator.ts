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
    new Date('2025-09-10T00:00:00-05:00'), // Week 2: Tue Sep 10 
    new Date('2025-09-17T00:00:00-05:00'), // Week 3: Tue Sep 17
    new Date('2025-09-24T00:00:00-05:00'), // Week 4: Tue Sep 24
    new Date('2025-10-01T00:00:00-05:00'), // Week 5: Tue Oct 1
    new Date('2025-10-08T00:00:00-05:00'), // Week 6: Tue Oct 8
    new Date('2025-10-15T00:00:00-05:00'), // Week 7: Tue Oct 15
    new Date('2025-10-22T00:00:00-05:00'), // Week 8: Tue Oct 22
    new Date('2025-10-29T00:00:00-05:00'), // Week 9: Tue Oct 29
    new Date('2025-11-05T00:00:00-05:00'), // Week 10: Tue Nov 5
    new Date('2025-11-12T00:00:00-05:00'), // Week 11: Tue Nov 12
    new Date('2025-11-19T00:00:00-05:00'), // Week 12: Tue Nov 19
    new Date('2025-11-26T00:00:00-05:00'), // Week 13: Tue Nov 26
    new Date('2025-12-03T00:00:00-05:00'), // Week 14: Tue Dec 3
    new Date('2025-12-10T00:00:00-05:00'), // Week 15: Tue Dec 10
    new Date('2025-12-17T00:00:00-05:00'), // Week 16: Tue Dec 17
    new Date('2025-12-24T00:00:00-05:00'), // Week 17: Tue Dec 24
    new Date('2025-12-31T00:00:00-05:00'), // Week 18: Tue Dec 31
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
    new Date('2025-09-10'), // Week 2
    new Date('2025-09-17'), // Week 3
    new Date('2025-09-24'), // Week 4
    new Date('2025-10-01'), // Week 5
    new Date('2025-10-08'), // Week 6
    new Date('2025-10-15'), // Week 7
    new Date('2025-10-22'), // Week 8
    new Date('2025-10-29'), // Week 9
    new Date('2025-11-05'), // Week 10
    new Date('2025-11-12'), // Week 11
    new Date('2025-11-19'), // Week 12
    new Date('2025-11-26'), // Week 13
    new Date('2025-12-03'), // Week 14
    new Date('2025-12-10'), // Week 15
    new Date('2025-12-17'), // Week 16
    new Date('2025-12-24'), // Week 17
    new Date('2025-12-31'), // Week 18
  ];
  
  const start = weekStarts[week - 1] || weekStarts[0];
  const end = weekStarts[week] || new Date('2026-01-05');
  
  return { start, end };
}