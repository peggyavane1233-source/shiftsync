/**
 * src/api/mock/seed.ts
 * PURPOSE: Generate deterministic seed data for the mock backend.
 */
import { addDays, subDays, startOfDay, addHours } from 'date-fns';
import uuid from 'react-native-uuid';
import {
  User, Department, Shift, ShiftAssignment, AttendanceRecord,
  FatigueScore, AppNotification, SwapRequest, Muster, MusterResponse
} from '../../types';

// Deterministic ID generator for consistent demo data
const makeId = (prefix: string, index: number) => `${prefix}-0000-0000-0000-${String(index).padStart(12, '0')}`;

const today = startOfDay(new Date());

export const generateSeedData = () => {
  // 1. Departments
  const departments: Department[] = [
    { id: makeId('dept', 1), name: 'Underground Zone 1', mineZone: 'UG-Z1', createdAt: new Date().toISOString() },
    { id: makeId('dept', 2), name: 'Underground Zone 2', mineZone: 'UG-Z2', createdAt: new Date().toISOString() },
    { id: makeId('dept', 3), name: 'Surface Processing', mineZone: 'SURF', createdAt: new Date().toISOString() },
  ];

  // 2. Users (Realistic Ghanaian names)
  const users: User[] = [];
  
  // Supervisors
  const supervisors = [
    { name: 'Kwame Mensah', dept: 1 },
    { name: 'Akua Osei', dept: 2 },
    { name: 'Yaw Appiah', dept: 3 },
  ];
  supervisors.forEach((sup, i) => {
    users.push({
      id: makeId('usr-sup', i + 1),
      email: `${(sup.name.split(' ')[0] || '').toLowerCase()}@shiftsync.io`,
      displayName: sup.name,
      role: 'SUPERVISOR',
      departmentId: makeId('dept', sup.dept),
      employeeNo: `SUP-${100 + i}`,
      isActive: true,
      createdAt: subDays(today, 365).toISOString(),
      updatedAt: subDays(today, 10).toISOString(),
    });
  });

  // Assign supervisors to departments
  departments[0]!.supervisorId = users[0]!.id;
  departments[1]!.supervisorId = users[1]!.id;
  departments[2]!.supervisorId = users[2]!.id;

  // Admin & Safety
  users.push({
    id: makeId('usr-adm', 1),
    email: 'admin@shiftsync.io',
    displayName: 'Afiya Baah',
    role: 'ADMIN',
    employeeNo: 'ADM-001',
    isActive: true,
    createdAt: subDays(today, 400).toISOString(),
    updatedAt: subDays(today, 20).toISOString(),
  });
  users.push({
    id: makeId('usr-saf', 1),
    email: 'safety@shiftsync.io',
    displayName: 'Kofi Owusu',
    role: 'SAFETY',
    employeeNo: 'SAF-001',
    isActive: true,
    createdAt: subDays(today, 350).toISOString(),
    updatedAt: subDays(today, 5).toISOString(),
  });

  // 25 Workers
  const workerNames = [
    'Ama Boateng', 'Kwadwo Asare', 'Abena Pokua', 'Kwabena Frimpong', 'Yaa Asantewaa',
    'Kwasi Addo', 'Akosua Manu', 'Kojo Nkrumah', 'Adwoa Boadu', 'Kwaku Nsiah',
    'Efua Boakye', 'Yaw Djan', 'Afia Serwaa', 'Kofi Gyan', 'Ama Serwaa',
    'Kwadwo Anim', 'Abena Yeboah', 'Kwabena Ofori', 'Yaa Oti', 'Kwasi Danquah',
    'Akosua Amponsah', 'Kojo Antwi', 'Adwoa Kumi', 'Kwaku Tawiah', 'Efua Ansah'
  ];
  
  workerNames.forEach((name, i) => {
    users.push({
      id: makeId('usr-wrk', i + 1),
      email: `${name.replace(' ', '.').toLowerCase()}@shiftsync.io`,
      displayName: name,
      role: 'WORKER',
      departmentId: makeId('dept', (i % 3) + 1),
      employeeNo: `WRK-${1000 + i}`,
      isActive: true,
      createdAt: subDays(today, 180).toISOString(),
      updatedAt: subDays(today, 1).toISOString(),
    });
  });

  const workers = users.filter(u => u.role === 'WORKER');

  // 3. Shifts (4 weeks: -14 days to +14 days)
  const shifts: Shift[] = [];
  const assignments: ShiftAssignment[] = [];
  const attendanceRecords: AttendanceRecord[] = [];
  
  let shiftCounter = 1;
  let assignCounter = 1;
  let attendCounter = 1;

  for (let dayOffset = -14; dayOffset <= 14; dayOffset++) {
    const currentDay = addDays(today, dayOffset);
    
    // For each department, create a DAY and NIGHT shift
    departments.forEach(dept => {
      const dayStart = addHours(currentDay, 6); // 06:00
      const dayEnd = addHours(currentDay, 18);  // 18:00
      
      const nightStart = addHours(currentDay, 18); // 18:00
      const nightEnd = addHours(currentDay, 30);   // 06:00 next day

      const dayShift: Shift = {
        id: makeId('shf', shiftCounter++),
        departmentId: dept.id,
        startTime: dayStart.toISOString(),
        endTime: dayEnd.toISOString(),
        shiftType: 'DAY',
        requiredWorkers: 5,
        status: 'PUBLISHED',
        createdBy: dept.supervisorId!,
        publishedAt: subDays(currentDay, 7).toISOString(),
      };
      
      const nightShift: Shift = {
        id: makeId('shf', shiftCounter++),
        departmentId: dept.id,
        startTime: nightStart.toISOString(),
        endTime: nightEnd.toISOString(),
        shiftType: 'NIGHT',
        requiredWorkers: 4,
        status: 'PUBLISHED',
        createdBy: dept.supervisorId!,
        publishedAt: subDays(currentDay, 7).toISOString(),
      };

      shifts.push(dayShift, nightShift);

      // Assign workers from this department
      const deptWorkers = workers.filter(w => w.departmentId === dept.id);
      
      // Simple rotating assignment: first half to DAY, second half to NIGHT
      const half = Math.floor(deptWorkers.length / 2);
      
      deptWorkers.forEach((worker, idx) => {
        const isDayShift = idx < half;
        const targetShift = isDayShift ? dayShift : nightShift;
        const isPast = dayOffset < 0;
        
        assignments.push({
          id: makeId('asn', assignCounter++),
          shiftId: targetShift.id,
          userId: worker.id,
          status: isPast ? 'COMPLETED' : 'CONFIRMED',
          assignedAt: subDays(currentDay, 5).toISOString(),
          confirmedAt: subDays(currentDay, 4).toISOString(),
        });

        // Generate Attendance for past shifts
        if (isPast) {
          // Occasional absence
          if (idx % 8 === 0 && dayOffset === -2) return; 

          const checkInTime = addHours(new Date(targetShift.startTime), (Math.random() * 0.2) - 0.1); // +/- 6 mins
          const checkOutTime = addHours(new Date(targetShift.endTime), (Math.random() * 0.2));

          attendanceRecords.push({
            id: makeId('att', attendCounter++),
            userId: worker.id,
            shiftId: targetShift.id,
            method: 'QR',
            checkInTime: checkInTime.toISOString(),
            checkOutTime: checkOutTime.toISOString(),
            capturedAt: checkInTime.toISOString(),
            syncedAt: addHours(checkInTime, 0.05).toISOString(),
            isOfflineSync: false,
            clientUuid: uuid.v4() as string,
          });
        }
      });
    });
  }

  // 4. Fatigue Scores
  const fatigueScores: FatigueScore[] = [];
  workers.forEach((worker, i) => {
    let score = 20; // Default LOW
    let riskLevel: 'LOW'|'ADVISORY'|'WARNING'|'CRITICAL' = 'LOW';

    // Rig specific scores to ensure we hit all conditions
    if (i === 0 || i === 1) { score = 85; riskLevel = 'CRITICAL'; }
    else if (i >= 2 && i <= 4) { score = 65; riskLevel = 'WARNING'; }
    else if (i >= 5 && i <= 9) { score = 45; riskLevel = 'ADVISORY'; }
    else { score = 20 + Math.floor(Math.random() * 15); }

    // Generate 30 days of history
    const history: { date: string, score: number }[] = [];
    let currentScore = Math.max(10, Math.min(60, score - 20)); // start somewhere lower
    for (let day = 29; day >= 0; day--) {
      // random walk
      const delta = (Math.random() - 0.5) * 15;
      currentScore = Math.max(10, Math.min(100, currentScore + delta));
      // Force the final day to match exactly the generated `score`
      if (day === 0) currentScore = score;
      
      history.push({
        date: subDays(today, day).toISOString(),
        score: Math.round(currentScore)
      });
    }

    fatigueScores.push({
      id: makeId('fat', i + 1),
      userId: worker.id,
      calculatedAt: new Date().toISOString(),
      hoursWorked24h: score > 60 ? 12 : 8,
      hoursWorked7d: score > 60 ? 72 : 40,
      nightShifts7d: score > 80 ? 4 : 0,
      consecutiveDays: score > 80 ? 7 : 3,
      score,
      riskLevel,
      modelVersion: 'FAID-mock-v1',
      history
    });
  });

  // 5. Notifications
  const notifications: AppNotification[] = [];
  for (let i = 1; i <= 6; i++) {
    notifications.push({
      id: makeId('not', i),
      userId: workers[0]!.id, // Assign to the first worker for demo testing
      type: 'SHIFT_CHANGE',
      channel: 'PUSH',
      title: 'Shift Updated',
      message: 'Your shift for tomorrow has been modified.',
      sentAt: subDays(new Date(), 1).toISOString(),
    });
  }

  // 6. Swap Requests
  const swapRequests: SwapRequest[] = [
    {
      id: makeId('swp', 1),
      requesterId: workers[0]!.id,
      targetUserId: workers[1]!.id,
      shiftId: shifts[30]!.id, // Some future shift
      status: 'PENDING',
      reason: 'Family emergency',
      createdAt: new Date().toISOString(),
    }
  ];

  // 7. Emergency Muster (historical)
  const musters: Muster[] = [
    {
      id: makeId('mst', 1),
      initiatedBy: users.find(u => u.role === 'SAFETY')!.id,
      zone: 'UG-Z1',
      initiatedAt: subDays(new Date(), 5).toISOString(),
      closedAt: addHours(subDays(new Date(), 5), 1).toISOString(),
      closedBy: users.find(u => u.role === 'ADMIN')!.id,
      expectedWorkers: 15,
      accountedWorkers: 15,
    }
  ];
  
  const musterResponses: MusterResponse[] = [];
  // Fake responses for the muster
  for(let i=0; i<15; i++) {
    musterResponses.push({
      id: makeId('mrp', i+1),
      musterId: musters[0]!.id,
      userId: workers[i]!.id,
      status: 'PRESENT',
      respondedAt: addHours(new Date(musters[0]!.initiatedAt), Math.random() * 0.1).toISOString()
    })
  }

  // 8. Certifications
  const certAssignments: any[] = [];
  workers.forEach((worker, i) => {
    // Everyone gets induction, expires in 100-300 days
    certAssignments.push({
      id: makeId('certa', certAssignments.length + 1),
      userId: worker.id,
      name: 'Underground Induction',
      expiryDays: 100 + Math.floor(Math.random() * 200)
    });
    // Random First Aid
    if (i % 2 === 0) {
      certAssignments.push({
        id: makeId('certa', certAssignments.length + 1),
        userId: worker.id,
        name: 'First Aid Level 2',
        // Make some expire soon (<=30) or expired (<=0) for demo
        expiryDays: i === 0 ? -5 : (i === 2 ? 14 : 90)
      });
    }
    // Random Heavy Machinery
    if (i % 3 === 0) {
      certAssignments.push({
        id: makeId('certa', certAssignments.length + 1),
        userId: worker.id,
        name: 'Heavy Machinery Ops',
        expiryDays: 45
      });
    }
  });

  return {
    departments,
    users,
    shifts,
    assignments,
    attendanceRecords,
    fatigueScores,
    notifications,
    swapRequests,
    musters,
    musterResponses,
    certAssignments
  };
};
