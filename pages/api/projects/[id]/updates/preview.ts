import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateAnalyzer } from '@/lib/updates/updateAnalyzer'
import { z } from 'zod'

const previewSchema = z.object({
  updateDescription: z.string().min(1).max(2000),
  selectedTaskIds: z.array(z.string())
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { id } = req.query
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid project ID' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Validate request body
    const validatedData = previewSchema.parse(req.body)

    // Get project with tasks
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: user.id
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            estimatedHours: true,
            priority: true,
            status: true
          }
        }
      }
    })

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    // Generate modifications for selected tasks
    const modifications = await updateAnalyzer.generateModifications(
      validatedData.selectedTaskIds,
      validatedData.updateDescription,
      project.tasks
    )

    res.status(200).json({ modifications })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      })
    }
    console.error('Error generating preview:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}