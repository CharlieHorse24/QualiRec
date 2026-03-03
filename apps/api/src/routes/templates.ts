import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { validateCreateTemplate } from '@qualirec/shared';
import { v4 as uuid } from 'uuid';

const router = Router();

// List templates
router.get('/', authenticate, async (req: Request, res: Response) => {
  const { type, includeArchived, drafts } = req.query;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (includeArchived !== 'true') where.isArchived = false;
  if (drafts === 'true') {
    where.isDraft = true;
    where.createdById = req.user!.userId;
  } else {
    where.isDraft = false;
  }

  const templates = await prisma.template.findMany({
    where,
    include: { createdBy: { select: { id: true, name: true, email: true } } },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  });

  res.json({ success: true, data: templates });
});

// Get single template
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const template = await prisma.template.findUnique({
    where: { id: req.params.id },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  if (!template) throw new AppError(404, 'Template not found');
  res.json({ success: true, data: template });
});

// Create template
router.post('/', authenticate, async (req: Request, res: Response) => {
  const validation = validateCreateTemplate(req.body);
  if (!validation.valid) {
    throw new AppError(400, validation.errors.join('; '));
  }

  const { name, type, description, sections, isDefault, isDraft } = req.body;

  // Add IDs to sections and questions if not present
  const processedSections = sections.map((section: Record<string, unknown>, si: number) => ({
    id: (section.id as string) || uuid(),
    title: section.title,
    order: si,
    questions: (section.questions as Array<Record<string, unknown>>).map((q, qi) => ({
      id: (q.id as string) || uuid(),
      text: q.text,
      hint: q.hint || '',
      responseType: q.responseType,
      options: q.options || [],
      required: q.required ?? false,
      flagForCRM: q.flagForCRM ?? false,
      crmFieldMapping: q.crmFieldMapping || '',
      order: qi,
    })),
  }));

  // If marking as default, unset other defaults of same type
  if (isDefault) {
    await prisma.template.updateMany({
      where: { type, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await prisma.template.create({
    data: {
      name,
      type,
      description: description || '',
      sections: processedSections,
      isDefault: isDefault ?? false,
      isDraft: isDraft ?? false,
      createdById: req.user!.userId,
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'CREATE',
      entityType: 'Template',
      entityId: template.id,
    },
  });

  res.status(201).json({ success: true, data: template });
});

// Update template
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  const existing = await prisma.template.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) throw new AppError(404, 'Template not found');

  const { name, description, sections, isDefault, isDraft, isArchived } = req.body;
  const updateData: Record<string, unknown> = {};

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (isDraft !== undefined) updateData.isDraft = isDraft;
  if (isArchived !== undefined) updateData.isArchived = isArchived;

  if (sections !== undefined) {
    updateData.sections = sections;
    // Bump version when sections change (template versioning)
    updateData.version = existing.version + 1;
  }

  if (isDefault === true) {
    await prisma.template.updateMany({
      where: { type: existing.type, isDefault: true, id: { not: existing.id } },
      data: { isDefault: false },
    });
    updateData.isDefault = true;
  } else if (isDefault === false) {
    updateData.isDefault = false;
  }

  const template = await prisma.template.update({
    where: { id: req.params.id },
    data: updateData,
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'UPDATE',
      entityType: 'Template',
      entityId: template.id,
      diff: req.body,
    },
  });

  res.json({ success: true, data: template });
});

// Clone template
router.post('/:id/clone', authenticate, async (req: Request, res: Response) => {
  const existing = await prisma.template.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) throw new AppError(404, 'Template not found');

  const template = await prisma.template.create({
    data: {
      name: `${existing.name} (Copy)`,
      type: existing.type,
      description: existing.description,
      sections: existing.sections as object,
      isDefault: false,
      isDraft: true,
      createdById: req.user!.userId,
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });

  res.status(201).json({ success: true, data: template });
});

// Archive template
router.post('/:id/archive', authenticate, async (req: Request, res: Response) => {
  const template = await prisma.template.update({
    where: { id: req.params.id },
    data: { isArchived: true, isDefault: false },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: 'ARCHIVE',
      entityType: 'Template',
      entityId: template.id,
    },
  });

  res.json({ success: true, data: template });
});

export default router;
