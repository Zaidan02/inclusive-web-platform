<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260825000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Store practical literacy abilities and application-specific position knowledge';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE candidate_profile ADD reading_ability VARCHAR(30) DEFAULT NULL');
        $this->addSql('ALTER TABLE candidate_profile ADD writing_ability VARCHAR(30) DEFAULT NULL');
        $this->addSql('ALTER TABLE candidate_profile ADD numeracy_ability VARCHAR(30) DEFAULT NULL');
        $this->addSql('ALTER TABLE job_application ADD position_knowledge_level VARCHAR(30) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE candidate_profile DROP reading_ability');
        $this->addSql('ALTER TABLE candidate_profile DROP writing_ability');
        $this->addSql('ALTER TABLE candidate_profile DROP numeracy_ability');
        $this->addSql('ALTER TABLE job_application DROP position_knowledge_level');
    }
}
