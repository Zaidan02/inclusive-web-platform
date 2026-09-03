<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260825000200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Store employer-controlled HR requirements and application compatibility snapshots';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE job_application ADD compatibility_score DOUBLE PRECISION DEFAULT NULL');
        $this->addSql('ALTER TABLE job_application ADD compatibility_eligible BOOLEAN DEFAULT NULL');
        $this->addSql('ALTER TABLE job_application ADD compatibility_snapshot JSON DEFAULT NULL');
        $this->addSql("ALTER TABLE job_post ADD education_requirement VARCHAR(20) DEFAULT 'not_required' NOT NULL");
        $this->addSql('ALTER TABLE job_post ADD minimum_education_level VARCHAR(50) DEFAULT NULL');
        $this->addSql("ALTER TABLE job_post ADD reading_requirement VARCHAR(20) DEFAULT 'not_required' NOT NULL");
        $this->addSql("ALTER TABLE job_post ADD writing_requirement VARCHAR(20) DEFAULT 'not_required' NOT NULL");
        $this->addSql("ALTER TABLE job_post ADD numeracy_requirement VARCHAR(20) DEFAULT 'not_required' NOT NULL");
        $this->addSql("ALTER TABLE job_post ADD position_knowledge_requirement VARCHAR(20) DEFAULT 'not_required' NOT NULL");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE job_application DROP compatibility_score');
        $this->addSql('ALTER TABLE job_application DROP compatibility_eligible');
        $this->addSql('ALTER TABLE job_application DROP compatibility_snapshot');
        $this->addSql('ALTER TABLE job_post DROP education_requirement');
        $this->addSql('ALTER TABLE job_post DROP minimum_education_level');
        $this->addSql('ALTER TABLE job_post DROP reading_requirement');
        $this->addSql('ALTER TABLE job_post DROP writing_requirement');
        $this->addSql('ALTER TABLE job_post DROP numeracy_requirement');
        $this->addSql('ALTER TABLE job_post DROP position_knowledge_requirement');
    }
}
