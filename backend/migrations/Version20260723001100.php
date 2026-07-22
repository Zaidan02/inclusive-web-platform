<?php
declare(strict_types=1);
namespace DoctrineMigrations;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
final class Version20260723001100 extends AbstractMigration
{
    public function getDescription(): string { return 'Derive company identity from employer profiles'; }
    public function up(Schema $schema): void { $this->addSql('ALTER TABLE job_post DROP company_name'); }
    public function down(Schema $schema): void { $this->addSql('ALTER TABLE job_post ADD company_name VARCHAR(255) NOT NULL'); }
}
