<?php

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'job_definition_task')]
#[ORM\UniqueConstraint(name: 'uniq_job_definition_task_key', columns: ['job_definition_id', 'task_key'])]
class JobDefinitionTask
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: JobDefinition::class, inversedBy: 'tasks')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?JobDefinition $jobDefinition = null;

    #[ORM\Column(length: 255)]
    private ?string $taskKey = null;

    #[ORM\Column(length: 500)]
    private ?string $name = null;

    #[ORM\Column]
    private int $position = 0;

    #[ORM\Column(options: ['default' => 1])]
    private float $weight = 1.0;

    #[ORM\Column(options: ['default' => false])]
    private bool $mandatory = false;

    /** @var Collection<int, DisabilityTaskAssessment> */
    #[ORM\OneToMany(mappedBy: 'task', targetEntity: DisabilityTaskAssessment::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $assessments;

    public function __construct() { $this->assessments = new ArrayCollection(); }

    public function getId(): ?int { return $this->id; }
    public function getJobDefinition(): ?JobDefinition { return $this->jobDefinition; }
    public function setJobDefinition(JobDefinition $job): static { $this->jobDefinition = $job; return $this; }
    public function getTaskKey(): ?string { return $this->taskKey; }
    public function setTaskKey(string $key): static { $this->taskKey = $key; return $this; }
    public function getName(): ?string { return $this->name; }
    public function setName(string $name): static { $this->name = $name; return $this; }
    public function getPosition(): int { return $this->position; }
    public function setPosition(int $position): static { $this->position = $position; return $this; }
    public function getWeight(): float { return $this->weight; }
    public function setWeight(float $weight): static { $this->weight = $weight; return $this; }
    public function isMandatory(): bool { return $this->mandatory; }
    public function setMandatory(bool $mandatory): static { $this->mandatory = $mandatory; return $this; }
    /** @return Collection<int, DisabilityTaskAssessment> */
    public function getAssessments(): Collection { return $this->assessments; }
}
