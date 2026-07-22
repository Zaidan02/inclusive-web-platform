<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'disability_task_assessment')]
#[ORM\UniqueConstraint(name: 'uniq_disability_task', columns: ['disability_id', 'task_id'])]
class DisabilityTaskAssessment
{
    public const FEASIBLE = 'feasible';
    public const NEEDS_ASSISTANCE = 'needs_assistance';
    public const AVOID = 'avoid';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Disability::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Disability $disability = null;

    #[ORM\ManyToOne(targetEntity: JobDefinitionTask::class, inversedBy: 'assessments')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?JobDefinitionTask $task = null;

    #[ORM\Column(length: 30)]
    private ?string $feasibility = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $sourceSheet = null;

    #[ORM\Column(nullable: true)]
    private ?int $sourceRow = null;

    public function getId(): ?int { return $this->id; }
    public function getDisability(): ?Disability { return $this->disability; }
    public function setDisability(Disability $disability): static { $this->disability = $disability; return $this; }
    public function getTask(): ?JobDefinitionTask { return $this->task; }
    public function setTask(JobDefinitionTask $task): static { $this->task = $task; return $this; }
    public function getFeasibility(): ?string { return $this->feasibility; }
    public function setFeasibility(string $feasibility): static
    {
        if (!in_array($feasibility, [self::FEASIBLE, self::NEEDS_ASSISTANCE, self::AVOID], true)) {
            throw new \InvalidArgumentException("Invalid feasibility value: {$feasibility}");
        }
        $this->feasibility = $feasibility;
        return $this;
    }
    public function getSourceSheet(): ?string { return $this->sourceSheet; }
    public function setSourceSheet(?string $sheet): static { $this->sourceSheet = $sheet; return $this; }
    public function getSourceRow(): ?int { return $this->sourceRow; }
    public function setSourceRow(?int $row): static { $this->sourceRow = $row; return $this; }
}
