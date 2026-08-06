<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260806000200 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Make all job application document uploads optional';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('UPDATE job_post SET cv_required = false, cover_letter_required = false');
        $this->addSql('ALTER TABLE job_post ALTER cv_required SET DEFAULT false');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE job_post ALTER cv_required SET DEFAULT true');
    }
}
