<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260910000100 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Track verification-email delivery time for resend cooldown enforcement';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD verification_email_sent_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" DROP verification_email_sent_at');
    }
}
