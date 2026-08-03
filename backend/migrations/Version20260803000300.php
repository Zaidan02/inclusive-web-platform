<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260803000300 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Assign an explicit candidate role to legacy candidate accounts';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            UPDATE "user"
            SET roles = '["ROLE_CANDIDATE"]'
            WHERE NOT jsonb_exists_any(roles::jsonb, ARRAY['ROLE_ADMIN', 'ROLE_EMPLOYER', 'ROLE_VERIFIER', 'ROLE_SUPER_ADMIN'])
        SQL);
    }

    public function down(Schema $schema): void
    {
        $this->addSql(<<<'SQL'
            UPDATE "user"
            SET roles = '["ROLE_USER"]'
            WHERE jsonb_exists(roles::jsonb, 'ROLE_CANDIDATE')
        SQL);
    }
}
