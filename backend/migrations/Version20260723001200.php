<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260723001200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add proof-of-concept employer assistance availability to job posts';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE job_post ADD assistance_available BOOLEAN DEFAULT FALSE NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE job_post DROP assistance_available');
    }
}
