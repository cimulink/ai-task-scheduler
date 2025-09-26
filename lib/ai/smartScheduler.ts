import { TaskAssignment, ResourceWeeklySchedule, AssignmentPreview } from './types'

interface TaskForScheduling {
  id: string
  title: string
  estimatedHours: number
  priority: number
  requiredRole?: string
}

interface ResourceForScheduling {
  id: string
  name: string
  role: string
  weeklyHours: number
  skills: string[]
  currentlyAssignedHours?: number
}

export class SmartScheduler {
  private readonly MAX_WEEKS = 12 // Plan up to 12 weeks ahead for better long-term planning
  private readonly PRIORITY_THRESHOLD_HIGH = 80
  private readonly PRIORITY_THRESHOLD_MEDIUM = 50

  assignTasksWithBandwidth(
    tasks: TaskForScheduling[],
    resources: ResourceForScheduling[]
  ): AssignmentPreview {
    console.log('[Smart Scheduler] Starting bandwidth-aware assignment')
    console.log(`[Smart Scheduler] Tasks: ${tasks.length}, Resources: ${resources.length}`)

    // Initialize resource schedules
    const schedules: ResourceWeeklySchedule[] = resources.map(resource => ({
      resourceId: resource.id,
      resourceName: resource.name,
      role: resource.role,
      weeklyCapacity: resource.weeklyHours,
      weeks: Array.from({ length: this.MAX_WEEKS }, (_, i) => ({
        weekNumber: i + 1,
        assignedHours: i === 0 ? (resource.currentlyAssignedHours || 0) : 0, // Current week starts with existing assignments
        availableHours: resource.weeklyHours - (i === 0 ? (resource.currentlyAssignedHours || 0) : 0),
        tasks: []
      }))
    }))

    // Sort tasks by priority (highest first)
    const sortedTasks = tasks.sort((a, b) => b.priority - a.priority)

    const assignments: TaskAssignment[] = []
    let immediateAssignments = 0
    let deferredAssignments = 0
    let overflowTasks = 0

    for (const task of sortedTasks) {
      // Skip tasks with no estimated hours or zero hours
      if (!task.estimatedHours || task.estimatedHours <= 0) {
        console.warn(`[Smart Scheduler] Skipping task "${task.title}" - no estimated hours (${task.estimatedHours}h)`)
        overflowTasks++
        continue
      }

      console.log(`[Smart Scheduler] Attempting to assign task: "${task.title}" (${task.estimatedHours}h, Priority: ${task.priority}, Role: ${task.requiredRole || 'any'})`)
      const assignment = this.findBestAssignment(task, schedules)

      if (assignment) {
        assignments.push(assignment)

        // Update the resource schedule
        const schedule = schedules.find(s => s.resourceId === assignment.resourceId)!
        const week = schedule.weeks[assignment.scheduledWeek - 1]

        week.assignedHours += task.estimatedHours
        week.availableHours -= task.estimatedHours
        week.tasks.push({
          taskId: task.id,
          title: task.title,
          hours: task.estimatedHours,
          priority: task.priority
        })

        // Count assignment types
        if (assignment.scheduledWeek === 1) {
          immediateAssignments++
        } else {
          deferredAssignments++
        }

        // isOverflow is now always false for successfully assigned tasks
        // overflowTasks will only be counted for unassigned tasks below

        console.log(`[Smart Scheduler] ✓ Assigned "${task.title}" to ${schedule.resourceName} (Week ${assignment.scheduledWeek})`)
      } else {
        console.warn(`[Smart Scheduler] ✗ Could not assign task: ${task.title}`)
        overflowTasks++
      }
    }

    const preview: AssignmentPreview = {
      assignments,
      schedules,
      summary: {
        totalTasks: tasks.length,
        immediateAssignments,
        deferredAssignments,
        overflowTasks
      }
    }

    console.log('[Smart Scheduler] Assignment completed:', preview.summary)
    console.log(`[Smart Scheduler] Final Results: ${assignments.length}/${sortedTasks.length} tasks successfully assigned`)

    if (overflowTasks > 0) {
      console.warn(`[Smart Scheduler] ${overflowTasks} tasks could not be assigned within the ${this.MAX_WEEKS}-week planning horizon`)
    }

    return preview
  }

  private findBestAssignment(
    task: TaskForScheduling,
    schedules: ResourceWeeklySchedule[]
  ): TaskAssignment | null {
    let bestAssignment: TaskAssignment | null = null
    let bestScore = -1
    let rejectionReasons: string[] = []

    for (const schedule of schedules) {
      // Check role compatibility
      const isCompatible = this.isRoleCompatible(task.requiredRole || '', schedule.role)
      if (task.requiredRole && !isCompatible) {
        rejectionReasons.push(`${schedule.resourceName}: Role mismatch (needs ${task.requiredRole}, has ${schedule.role})`)
        continue
      }

      // Find the earliest week where this task can fit
      let foundSlot = false
      for (let weekIndex = 0; weekIndex < schedule.weeks.length; weekIndex++) {
        const week = schedule.weeks[weekIndex]

        if (week.availableHours >= task.estimatedHours) {
          const weekNumber = weekIndex + 1
          const isOverflow = false // Never mark as overflow if we found capacity
          const score = this.calculateAssignmentScore(task, schedule, weekNumber)

          if (score > bestScore) {
            bestScore = score
            bestAssignment = {
              taskId: task.id,
              resourceId: schedule.resourceId,
              scheduledWeek: weekNumber,
              reason: this.generateAssignmentReason(task, schedule, weekNumber, isOverflow),
              isOverflow
            }
          }
          foundSlot = true
          break // Found earliest available week for this resource
        }
      }

      if (!foundSlot) {
        const totalAvailable = schedule.weeks.reduce((sum, week) => sum + week.availableHours, 0)
        rejectionReasons.push(`${schedule.resourceName}: No weekly slot with ${task.estimatedHours}h available (total available: ${totalAvailable}h across all weeks)`)
      }
    }

    if (!bestAssignment && rejectionReasons.length > 0) {
      console.log(`[Smart Scheduler] Task "${task.title}" rejected by all resources:`)
      rejectionReasons.forEach(reason => console.log(`  - ${reason}`))
    }

    return bestAssignment
  }

  private isRoleCompatible(requiredRole: string, resourceRole: string): boolean {
    // More flexible role matching that handles case variations and partial matches
    const roleCompatibility: Record<string, string[]> = {
      'developer': ['developer', 'full stack developer', 'backend developer', 'frontend developer', 'software engineer', 'engineer'],
      'designer': ['designer', 'ui designer', 'ux designer', 'graphic designer', 'visual designer'],
      'manager': ['manager', 'project manager', 'team lead', 'lead', 'coordinator'],
      'copywriter': ['copywriter', 'content writer', 'marketing specialist', 'writer']
    }

    const requiredRoleLower = requiredRole.toLowerCase()
    const resourceRoleLower = resourceRole.toLowerCase()

    // Direct match
    if (requiredRoleLower === resourceRoleLower) {
      return true
    }

    // Check compatibility mapping
    const compatibleRoles = roleCompatibility[requiredRoleLower] || []
    if (compatibleRoles.some(role => resourceRoleLower.includes(role) || role.includes(resourceRoleLower))) {
      return true
    }

    // Allow 'Other' resources to handle any task
    if (resourceRoleLower === 'other' || resourceRoleLower === 'general') {
      return true
    }

    // If no specific role requirement or 'any', any resource can handle it
    if (!requiredRole || requiredRole.trim() === '' || requiredRoleLower === 'any') {
      return true
    }

    return false
  }

  private calculateAssignmentScore(
    task: TaskForScheduling,
    schedule: ResourceWeeklySchedule,
    weekNumber: number
  ): number {
    let score = 0

    // Priority bonus - higher priority tasks get preference
    score += task.priority

    // Earlier week bonus
    score += (this.MAX_WEEKS - weekNumber) * 10

    // Resource utilization bonus - prefer resources with more availability
    const weekUtilization = schedule.weeks[weekNumber - 1].assignedHours / schedule.weeklyCapacity
    score += (1 - weekUtilization) * 20

    // High priority tasks should go to week 1 if possible
    if (task.priority >= this.PRIORITY_THRESHOLD_HIGH && weekNumber === 1) {
      score += 50
    }

    return score
  }

  private generateAssignmentReason(
    task: TaskForScheduling,
    schedule: ResourceWeeklySchedule,
    weekNumber: number,
    isOverflow: boolean
  ): string {
    if (weekNumber === 1) {
      if (task.priority >= this.PRIORITY_THRESHOLD_HIGH) {
        return `High priority task scheduled immediately`
      } else {
        return `Available capacity this week`
      }
    } else {
      return `Week ${weekNumber} - Scheduled based on capacity and priority`
    }
  }

  // Helper method to get scheduling summary text
  getSchedulingSummary(preview: AssignmentPreview): {
    title: string
    description: string
    suggestions: string[]
  } {
    const { summary, schedules } = preview

    let title = "Assignment Complete"
    let description = ""
    const suggestions: string[] = []

    if (summary.overflowTasks > 0) {
      title = "Some Tasks Unscheduled"
      description = `${summary.immediateAssignments} tasks start this week, ${summary.deferredAssignments} tasks scheduled for future weeks. ${summary.overflowTasks} tasks could not be scheduled within the planning horizon.`

      suggestions.push("Consider increasing team capacity for unscheduled tasks")
      suggestions.push("Extend planning horizon beyond 12 weeks")
      suggestions.push("Split large tasks into smaller chunks")
    } else {
      description = `All ${summary.totalTasks} tasks successfully scheduled. ${summary.immediateAssignments} this week, ${summary.deferredAssignments} in upcoming weeks.`
    }

    // Check for over-utilized resources
    const overUtilizedResources = schedules.filter(schedule =>
      schedule.weeks[0].assignedHours > schedule.weeklyCapacity * 0.9
    )

    if (overUtilizedResources.length > 0) {
      suggestions.push(`${overUtilizedResources.length} team member(s) near capacity limit`)
    }

    return { title, description, suggestions }
  }
}