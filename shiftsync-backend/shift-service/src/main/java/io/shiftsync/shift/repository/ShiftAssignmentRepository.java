package io.shiftsync.shift.repository;

import io.shiftsync.shift.domain.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, UUID> {

    List<ShiftAssignment> findByShiftId(UUID shiftId);
    
    List<ShiftAssignment> findByUserId(UUID userId);

    /**
     * Checks if the user already has an active assignment (DRAFT or PUBLISHED shift)
     * that overlaps with the given time range.
     * Uses PostgreSQL native tstzrange overlap operator (&&).
     */
    @Query(value = "SELECT count(sa.id) > 0 FROM shift_assignments sa " +
                   "JOIN shifts s ON sa.shift_id = s.id " +
                   "WHERE sa.user_id = :userId " +
                   "AND sa.status NOT IN ('CANCELLED', 'SWAPPED', 'ABSENT') " +
                   "AND s.status IN ('DRAFT', 'PUBLISHED') " +
                   "AND tstzrange(s.start_time, s.end_time) && tstzrange(cast(:newStart as timestamptz), cast(:newEnd as timestamptz))", 
           nativeQuery = true)
    boolean hasOverlappingAssignment(@Param("userId") UUID userId, 
                                     @Param("newStart") Instant newStart, 
                                     @Param("newEnd") Instant newEnd);

    /**
     * Gets the end time of the user's most recent shift that ended before the given start time.
     */
    @Query(value = "SELECT s.end_time FROM shift_assignments sa " +
                   "JOIN shifts s ON sa.shift_id = s.id " +
                   "WHERE sa.user_id = :userId " +
                   "AND sa.status NOT IN ('CANCELLED', 'SWAPPED', 'ABSENT') " +
                   "AND s.end_time <= :newStart " +
                   "ORDER BY s.end_time DESC LIMIT 1", 
           nativeQuery = true)
    Optional<Instant> findLatestShiftEndTimeBefore(@Param("userId") UUID userId, 
                                                   @Param("newStart") Instant newStart);
}
