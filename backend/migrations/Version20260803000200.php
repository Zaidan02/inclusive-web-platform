<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260803000200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Normalize Doctrine index names for clean schema validation';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER INDEX idx_profile_ai_event_candidate RENAME TO IDX_BEB69A5D91BD8781');
        $this->addSql('ALTER INDEX idx_candidate_task_skill_profile RENAME TO IDX_AB5EE869FE3D0586');
        $this->addSql('ALTER INDEX idx_candidate_task_skill_task RENAME TO IDX_AB5EE8698DB60186');
        $this->addSql('ALTER INDEX uniq_candidate_verification_candidate RENAME TO UNIQ_D1F9B82891BD8781');
        $this->addSql('ALTER INDEX idx_candidate_verification_reviewer RENAME TO IDX_D1F9B82870574616');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER INDEX idx_beb69a5d91bd8781 RENAME TO IDX_PROFILE_AI_EVENT_CANDIDATE');
        $this->addSql('ALTER INDEX idx_ab5ee869fe3d0586 RENAME TO IDX_CANDIDATE_TASK_SKILL_PROFILE');
        $this->addSql('ALTER INDEX idx_ab5ee8698db60186 RENAME TO IDX_CANDIDATE_TASK_SKILL_TASK');
        $this->addSql('ALTER INDEX uniq_d1f9b82891bd8781 RENAME TO UNIQ_CANDIDATE_VERIFICATION_CANDIDATE');
        $this->addSql('ALTER INDEX idx_d1f9b82870574616 RENAME TO IDX_CANDIDATE_VERIFICATION_REVIEWER');
    }
}
