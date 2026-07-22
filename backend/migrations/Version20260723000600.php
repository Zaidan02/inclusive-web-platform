<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260723000600 extends AbstractMigration
{
    public function getDescription(): string { return 'Normalize candidate disability selections and remove inferred abilities'; }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE candidate_profile_disability (candidate_profile_id INT NOT NULL, disability_id INT NOT NULL, PRIMARY KEY (candidate_profile_id, disability_id))');
        $this->addSql('CREATE INDEX IDX_63634D0AFE3D0586 ON candidate_profile_disability (candidate_profile_id)');
        $this->addSql('CREATE INDEX IDX_63634D0A709924E5 ON candidate_profile_disability (disability_id)');
        $this->addSql('ALTER TABLE candidate_profile_disability ADD CONSTRAINT FK_B69C5F6791B7A1A2 FOREIGN KEY (candidate_profile_id) REFERENCES candidate_profile (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE candidate_profile_disability ADD CONSTRAINT FK_B69C5F6770924E5 FOREIGN KEY (disability_id) REFERENCES disability (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('INSERT INTO candidate_profile_disability (candidate_profile_id, disability_id) SELECT cp.id, d.id FROM candidate_profile cp CROSS JOIN LATERAL json_array_elements_text(cp.selected_disabilities) selected(name) JOIN disability d ON LOWER(d.name) = LOWER(selected.name) ON CONFLICT DO NOTHING');
        $this->addSql('ALTER TABLE candidate_profile DROP selected_disabilities');
        $this->addSql('ALTER TABLE candidate_profile DROP remaining_abilities');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE candidate_profile ADD selected_disabilities JSON DEFAULT \'[]\' NOT NULL');
        $this->addSql('ALTER TABLE candidate_profile ADD remaining_abilities JSON DEFAULT \'[]\' NOT NULL');
        $this->addSql("UPDATE candidate_profile cp SET selected_disabilities = COALESCE((SELECT json_agg(d.name) FROM candidate_profile_disability cpd JOIN disability d ON d.id = cpd.disability_id WHERE cpd.candidate_profile_id = cp.id), '[]'::json)");
        $this->addSql('ALTER TABLE candidate_profile_disability DROP CONSTRAINT FK_B69C5F6791B7A1A2');
        $this->addSql('ALTER TABLE candidate_profile_disability DROP CONSTRAINT FK_B69C5F6770924E5');
        $this->addSql('DROP TABLE candidate_profile_disability');
    }
}
