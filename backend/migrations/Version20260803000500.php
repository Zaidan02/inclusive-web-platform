<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260803000500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Align verification access-audit index names with Doctrine metadata';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER INDEX idx_verification_access_request RENAME TO IDX_FBF89FA4D9E932AB');
        $this->addSql('ALTER INDEX idx_verification_access_actor RENAME TO IDX_FBF89FA410DAF24A');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER INDEX idx_fbf89fa4d9e932ab RENAME TO IDX_VERIFICATION_ACCESS_REQUEST');
        $this->addSql('ALTER INDEX idx_fbf89fa410daf24a RENAME TO IDX_VERIFICATION_ACCESS_ACTOR');
    }
}
