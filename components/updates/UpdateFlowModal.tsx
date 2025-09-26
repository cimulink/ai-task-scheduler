import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { UpdateInputForm } from './UpdateInputForm'
import { ImpactReview } from './ImpactReview'
import { ModificationPreview } from './ModificationPreview'
import { UpdateSummary } from './UpdateSummary'

export interface Task {
  id: string
  title: string
  description: string | null
  estimatedHours: number | null
  priority: number
  status: string
}

export interface AffectedTask {
  taskId: string
  relevanceScore: number
  reason: string
  currentStatus: string
}

export interface SuggestedNewTask {
  title: string
  description: string
  estimatedHours: number
  priority: number
}

export interface TaskModification {
  taskId: string
  title?: string
  description?: string
  estimatedHours?: number
  priority?: number
  reasoning: string
}

interface UpdateFlowModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  existingTasks: Task[]
  onUpdateComplete: () => void
}

type UpdateStep =
  | 'input'
  | 'impact-review'
  | 'modification-preview'
  | 'summary'
  | 'applying'

interface UpdateFlowState {
  updateDescription: string
  affectedTasks: AffectedTask[]
  suggestedNewTasks: SuggestedNewTask[]
  selectedTaskIds: string[]
  taskModifications: TaskModification[]
  approvedNewTasks: SuggestedNewTask[]
  inProgressTasksConfirmed: Set<string>
}

export const UpdateFlowModal: React.FC<UpdateFlowModalProps> = ({
  isOpen,
  onClose,
  projectId,
  existingTasks,
  onUpdateComplete
}) => {
  const [currentStep, setCurrentStep] = useState<UpdateStep>('input')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [flowState, setFlowState] = useState<UpdateFlowState>({
    updateDescription: '',
    affectedTasks: [],
    suggestedNewTasks: [],
    selectedTaskIds: [],
    taskModifications: [],
    approvedNewTasks: [],
    inProgressTasksConfirmed: new Set()
  })

  // Cache management
  const getCacheKey = (description: string) => `update-flow-${projectId}-${btoa(description).slice(0, 20)}`

  const saveToCache = (data: Partial<UpdateFlowState>) => {
    if (!flowState.updateDescription) return
    try {
      const cacheKey = getCacheKey(flowState.updateDescription)
      const cacheData = {
        ...data,
        timestamp: Date.now(),
        projectId,
        taskCount: existingTasks.length
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      console.log('[UpdateFlow] Saved to cache:', cacheKey)
    } catch (error) {
      console.warn('[UpdateFlow] Failed to save to cache:', error)
    }
  }

  const loadFromCache = (description: string): Partial<UpdateFlowState> | null => {
    try {
      const cacheKey = getCacheKey(description)
      const cached = localStorage.getItem(cacheKey)
      if (!cached) return null

      const cacheData = JSON.parse(cached)

      // Validate cache is still relevant (same project, similar task count)
      if (cacheData.projectId !== projectId ||
          Math.abs(cacheData.taskCount - existingTasks.length) > 2 ||
          Date.now() - cacheData.timestamp > 24 * 60 * 60 * 1000) { // 24 hours
        localStorage.removeItem(cacheKey)
        return null
      }

      console.log('[UpdateFlow] Loaded from cache:', cacheKey)
      return cacheData
    } catch (error) {
      console.warn('[UpdateFlow] Failed to load from cache:', error)
      return null
    }
  }

  const clearCache = () => {
    if (!flowState.updateDescription) return
    try {
      const cacheKey = getCacheKey(flowState.updateDescription)
      localStorage.removeItem(cacheKey)
      console.log('[UpdateFlow] Cleared cache:', cacheKey)
    } catch (error) {
      console.warn('[UpdateFlow] Failed to clear cache:', error)
    }
  }

  const resetFlow = () => {
    setCurrentStep('input')
    setError(null)
    setFlowState({
      updateDescription: '',
      affectedTasks: [],
      suggestedNewTasks: [],
      selectedTaskIds: [],
      taskModifications: [],
      approvedNewTasks: [],
      inProgressTasksConfirmed: new Set()
    })
  }

  const handleReEvaluate = () => {
    if (!flowState.updateDescription) return

    // Clear cache and force re-evaluation
    clearCache()
    console.log('[UpdateFlow] Re-evaluating, clearing cache and restarting from impact review')

    // Reset to impact review step to trigger fresh API calls
    setCurrentStep('impact-review')
    setFlowState(prev => ({
      ...prev,
      affectedTasks: [],
      suggestedNewTasks: [],
      selectedTaskIds: [],
      taskModifications: [],
      approvedNewTasks: [],
      inProgressTasksConfirmed: new Set()
    }))
  }

  const handleClose = () => {
    resetFlow()
    onClose()
  }

  const handleStepComplete = (stepData: any) => {
    switch (currentStep) {
      case 'input':
        // Check cache first when moving from input to impact-review
        const cachedData = loadFromCache(stepData.updateDescription)
        if (cachedData) {
          console.log('[UpdateFlow] Using cached data, skipping API call')
          setFlowState(prev => ({
            ...prev,
            ...stepData,
            affectedTasks: cachedData.affectedTasks || [],
            suggestedNewTasks: cachedData.suggestedNewTasks || []
          }))
        } else {
          setFlowState(prev => ({
            ...prev,
            ...stepData
          }))
        }
        setCurrentStep('impact-review')
        break
      case 'impact-review':
        const updatedState = {
          selectedTaskIds: stepData.selectedTaskIds,
          approvedNewTasks: stepData.selectedNewTasks || [], // Map selectedNewTasks to approvedNewTasks
          inProgressTasksConfirmed: stepData.inProgressTasksConfirmed
        }
        console.log('[UpdateFlowModal] Impact review completed:')
        console.log('- Selected tasks:', stepData.selectedTaskIds?.length || 0)
        console.log('- Selected new tasks:', stepData.selectedNewTasks?.length || 0)
        console.log('- Mapped to approvedNewTasks:', updatedState.approvedNewTasks.length)
        if (updatedState.approvedNewTasks.length > 0) {
          console.log('- New task titles:', updatedState.approvedNewTasks.map((t: any) => t.title))
        }
        setFlowState(prev => ({
          ...prev,
          ...updatedState
        }))
        // Save analysis results to cache
        saveToCache({
          updateDescription: flowState.updateDescription,
          affectedTasks: flowState.affectedTasks,
          suggestedNewTasks: flowState.suggestedNewTasks,
          ...updatedState
        })
        setCurrentStep('modification-preview')
        break
      case 'modification-preview':
        const modificationState = {
          ...stepData
        }
        setFlowState(prev => ({
          ...prev,
          ...modificationState
        }))
        // Save modifications to cache for future use
        saveToCache({
          updateDescription: flowState.updateDescription,
          affectedTasks: flowState.affectedTasks,
          suggestedNewTasks: flowState.suggestedNewTasks,
          selectedTaskIds: flowState.selectedTaskIds,
          ...modificationState
        })
        setCurrentStep('summary')
        break
      case 'summary':
        // Clear cache after successful completion
        clearCache()
        handleApplyChanges(stepData)
        break
    }
  }

  const handleApplyChanges = async (finalData: any) => {
    setCurrentStep('applying')
    setIsLoading(true)

    console.log('[UpdateFlowModal] Applying changes with:')
    console.log('- Task modifications:', finalData.taskModifications?.length || 0)
    console.log('- New tasks:', finalData.approvedNewTasks?.length || 0)
    if (finalData.approvedNewTasks?.length > 0) {
      console.log('- New task titles:', finalData.approvedNewTasks.map((t: any) => t.title))
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/updates/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updateDescription: flowState.updateDescription,
          taskModifications: finalData.taskModifications,
          newTasks: finalData.approvedNewTasks
        })
      })

      if (!response.ok) {
        throw new Error('Failed to apply updates')
      }

      onUpdateComplete()
      handleClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to apply updates')
      setCurrentStep('summary') // Go back to summary on error
    } finally {
      setIsLoading(false)
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'input':
        return 'Describe Project Update'
      case 'impact-review':
        return 'Review Impact Analysis'
      case 'modification-preview':
        return 'Review Suggested Changes'
      case 'summary':
        return 'Final Review & Apply'
      case 'applying':
        return 'Applying Changes...'
      default:
        return 'Update Project'
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'input':
        return (
          <UpdateInputForm
            projectId={projectId}
            onComplete={handleStepComplete}
            isLoading={isLoading}
            error={error}
          />
        )
      case 'impact-review':
        return (
          <ImpactReview
            updateDescription={flowState.updateDescription}
            affectedTasks={flowState.affectedTasks}
            suggestedNewTasks={flowState.suggestedNewTasks}
            existingTasks={existingTasks}
            onComplete={handleStepComplete}
            onBack={() => setCurrentStep('input')}
            isLoading={isLoading}
          />
        )
      case 'modification-preview':
        // Check if we have cached modifications for this update
        const cachedModifications = loadFromCache(flowState.updateDescription)
        return (
          <ModificationPreview
            projectId={projectId}
            updateDescription={flowState.updateDescription}
            selectedTaskIds={flowState.selectedTaskIds}
            inProgressTasksConfirmed={flowState.inProgressTasksConfirmed}
            existingTasks={existingTasks}
            onComplete={handleStepComplete}
            onBack={() => setCurrentStep('impact-review')}
            isLoading={isLoading}
            error={error}
            cachedModifications={cachedModifications?.taskModifications || null}
          />
        )
      case 'summary':
        return (
          <UpdateSummary
            updateDescription={flowState.updateDescription}
            taskModifications={flowState.taskModifications}
            newTasks={flowState.approvedNewTasks}
            existingTasks={existingTasks}
            onComplete={handleStepComplete}
            onBack={() => setCurrentStep('modification-preview')}
            isLoading={isLoading}
            error={error}
          />
        )
      case 'applying':
        return (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Applying your changes...</p>
          </div>
        )
    }
  }

  const getStepNumber = () => {
    switch (currentStep) {
      case 'input': return 1
      case 'impact-review': return 2
      case 'modification-preview': return 3
      case 'summary': return 4
      case 'applying': return 4
      default: return 1
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getStepTitle()}
      size="xl"
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  step <= getStepNumber()
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step}
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            {/* Re-evaluate button - show after step 1 and if we have cached data or are past impact review */}
            {(currentStep !== 'input' && currentStep !== 'applying' && flowState.updateDescription) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReEvaluate}
                disabled={isLoading}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Re-evaluate</span>
                </div>
              </Button>
            )}

            <span className="text-sm text-gray-500">
              Step {getStepNumber()} of 4
            </span>
          </div>
        </div>

        {/* Current step content */}
        <div className="min-h-[400px]">
          {renderCurrentStep()}
        </div>
      </div>
    </Modal>
  )
}