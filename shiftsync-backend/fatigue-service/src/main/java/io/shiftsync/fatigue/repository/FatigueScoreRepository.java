package io.shiftsync.fatigue.repository;

import io.shiftsync.fatigue.domain.FatigueScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FatigueScoreRepository extends JpaRepository<FatigueScore, UUID> {

    /** Most recent score for a worker — the one attendance-service checks before check-in. */
    Optional<FatigueScore> findFirstByUserIdOrderByCalculatedAtDesc(UUID userId);

    /** 30-day trend for supervisor view. */
    List<FatigueScore> findByUserIdAndCalculatedAtAfterOrderByCalculatedAtDesc(UUID userId, Instant since);

    /** All latest scores for a department's workers (heatmap). */
    @Query(value = """
        SELECT DISTINCT ON (user_id) *
        FROM fatigue_scores
        WHERE user_id IN :userIds
        ORDER BY user_id, calculated_at DESC
        """, nativeQuery = true)
    List<FatigueScore> findLatestScoresForUsers(@Param("userIds") List<UUID> userIds);
}
