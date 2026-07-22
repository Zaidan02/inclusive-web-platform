<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260723000500 extends AbstractMigration
{
    public function getDescription(): string { return 'Allow employer postings to reference an admin-controlled job definition'; }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE job_post ADD job_definition_id INT DEFAULT NULL');
        $this->addSql('CREATE INDEX IDX_DD461ACC7AC0F7DD ON job_post (job_definition_id)');
        $this->addSql('ALTER TABLE job_post ADD CONSTRAINT FK_JOB_POST_DEFINITION FOREIGN KEY (job_definition_id) REFERENCES job_definition (id) NOT DEFERRABLE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE job_post DROP CONSTRAINT FK_JOB_POST_DEFINITION');
        $this->addSql('DROP INDEX IDX_DD461ACC7AC0F7DD');
        $this->addSql('ALTER TABLE job_post DROP job_definition_id');
    }
}
