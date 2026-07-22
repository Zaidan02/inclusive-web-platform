<?php
declare(strict_types=1);
namespace DoctrineMigrations;
use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;
final class Version20260723001000 extends AbstractMigration
{
    public function getDescription(): string { return 'Add basic candidate profile information'; }
    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE candidate_profile ADD first_name VARCHAR(100) DEFAULT NULL');
        $this->addSql('ALTER TABLE candidate_profile ADD last_name VARCHAR(100) DEFAULT NULL');
        $this->addSql('ALTER TABLE candidate_profile ADD phone VARCHAR(40) DEFAULT NULL');
        $this->addSql('ALTER TABLE candidate_profile ADD location VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE candidate_profile ADD about TEXT DEFAULT NULL');
    }
    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE candidate_profile DROP first_name, DROP last_name, DROP phone, DROP location, DROP about');
    }
}
