<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'candidate_task_skill')]
#[ORM\UniqueConstraint(name: 'uniq_candidate_task_skill', columns: ['candidate_profile_id', 'task_id'])]
class CandidateTaskSkill
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: CandidateProfile::class, inversedBy: 'taskSkills')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?CandidateProfile $candidateProfile = null;

    #[ORM\ManyToOne(targetEntity: JobDefinitionTask::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?JobDefinitionTask $task = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $note = null;

    #[ORM\Column(length: 20, options: ['default' => 'manual'])]
    private string $source = 'manual';

    #[ORM\Column]
    private \DateTimeImmutable $confirmedAt;

    public function __construct()
    {
        $this->confirmedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getCandidateProfile(): ?CandidateProfile { return $this->candidateProfile; }
    public function setCandidateProfile(CandidateProfile $profile): static { $this->candidateProfile = $profile; return $this; }
    public function getTask(): ?JobDefinitionTask { return $this->task; }
    public function setTask(JobDefinitionTask $task): static { $this->task = $task; return $this; }
    public function getNote(): ?string { return $this->note; }
    public function setNote(?string $note): static { $this->note = $note; return $this; }
    public function getSource(): string { return $this->source; }
    public function setSource(string $source): static { $this->source = $source; return $this; }
    public function getConfirmedAt(): \DateTimeImmutable { return $this->confirmedAt; }
    public function setConfirmedAt(\DateTimeImmutable $confirmedAt): static { $this->confirmedAt = $confirmedAt; return $this; }
}
