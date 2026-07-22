<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'job_post_highlighted_task')]
#[ORM\UniqueConstraint(name: 'uniq_post_highlighted_task', columns: ['job_post_id', 'task_id'])]
class JobPostHighlightedTask
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: JobPost::class, inversedBy: 'highlightedTasks')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?JobPost $jobPost = null;

    #[ORM\ManyToOne(targetEntity: JobDefinitionTask::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?JobDefinitionTask $task = null;

    #[ORM\Column]
    private int $displayPosition = 0;

    public function getId(): ?int { return $this->id; }
    public function getJobPost(): ?JobPost { return $this->jobPost; }
    public function setJobPost(JobPost $post): static { $this->jobPost = $post; return $this; }
    public function getTask(): ?JobDefinitionTask { return $this->task; }
    public function setTask(JobDefinitionTask $task): static { $this->task = $task; return $this; }
    public function getDisplayPosition(): int { return $this->displayPosition; }
    public function setDisplayPosition(int $position): static { $this->displayPosition = $position; return $this; }
}
