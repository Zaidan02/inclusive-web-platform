<?php
declare(strict_types=1);
namespace DoctrineMigrations;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260723000800 extends AbstractMigration
{
    public function getDescription(): string { return 'Add candidate education level'; }
    public function up(Schema $schema): void { $this->addSql('ALTER TABLE candidate_profile ADD education_level VARCHAR(50) DEFAULT NULL'); }
    public function down(Schema $schema): void { $this->addSql('ALTER TABLE candidate_profile DROP education_level'); }
}
