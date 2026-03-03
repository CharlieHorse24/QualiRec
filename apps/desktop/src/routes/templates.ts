import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export function createTemplateRoutes(): Router {
  const router = Router();
  const prisma = new PrismaClient();

  router.get('/', authenticate, async (req: Request, res: Response) => {
    const { type, includeArchived } = req.query;
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (includeArchived !== 'true') where.isArchived = false;
    where.isDraft = false;

    const templates = await prisma.template.findMany({
      where,
      include: { createdBy: { select: { id: true, name: true, email: true } } },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    res.json({
      success: true,
      data: templates.map((t) => ({ ...t, sections: JSON.parse(t.sections || '[]') })),
    });
  });

  router.get('/:id', authenticate, async (req: Request, res: Response) => {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    if (!template) throw new AppError(404, 'Template not found');
    res.json({ success: true, data: { ...template, sections: JSON.parse(template.sections || '[]') } });
  });

  router.post('/', authenticate, async (req: Request, res: Response) => {
    const { name, type, description, sections, isDefault, isDraft } = req.body;
    if (!name || !type || !sections) throw new AppError(400, 'name, type, sections required');

    // Add IDs to sections/questions
    let order = 0;
    const processed = sections.map((s: Record<string, unknown>, si: number) => ({
      id: (s.id as string) || `s-${Date.now()}-${si}`,
      title: s.title, order: si,
      questions: ((s.questions as Array<Record<string, unknown>>) || []).map((q, qi) => ({
        id: (q.id as string) || `q-${Date.now()}-${order++}`,
        text: q.text, hint: q.hint || '', responseType: q.responseType,
        options: q.options || [], required: q.required ?? false,
        flagForCRM: q.flagForCRM ?? false, crmFieldMapping: q.crmFieldMapping || '', order: qi,
      })),
    }));

    if (isDefault) {
      await prisma.template.updateMany({ where: { type, isDefault: true }, data: { isDefault: false } });
    }

    const template = await prisma.template.create({
      data: {
        name, type, description: description || '', sections: JSON.stringify(processed),
        isDefault: isDefault ?? false, isDraft: isDraft ?? false, createdById: req.user!.userId,
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ success: true, data: { ...template, sections: JSON.parse(template.sections || '[]') } });
  });

  router.put('/:id', authenticate, async (req: Request, res: Response) => {
    const existing = await prisma.template.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Template not found');

    const { name, description, sections, isDefault, isDraft, isArchived } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (isDraft !== undefined) data.isDraft = isDraft;
    if (isArchived !== undefined) data.isArchived = isArchived;
    if (sections !== undefined) {
      data.sections = JSON.stringify(sections);
      data.version = existing.version + 1;
    }
    if (isDefault === true) {
      await prisma.template.updateMany({ where: { type: existing.type, isDefault: true }, data: { isDefault: false } });
      data.isDefault = true;
    }

    const template = await prisma.template.update({
      where: { id: req.params.id }, data,
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    res.json({ success: true, data: { ...template, sections: JSON.parse(template.sections || '[]') } });
  });

  router.post('/:id/clone', authenticate, async (req: Request, res: Response) => {
    const existing = await prisma.template.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Template not found');
    const template = await prisma.template.create({
      data: {
        name: `${existing.name} (Copy)`, type: existing.type, description: existing.description,
        sections: existing.sections, isDefault: false, isDraft: true, createdById: req.user!.userId,
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json({ success: true, data: { ...template, sections: JSON.parse(template.sections || '[]') } });
  });

  router.post('/:id/archive', authenticate, async (req: Request, res: Response) => {
    const template = await prisma.template.update({
      where: { id: req.params.id }, data: { isArchived: true, isDefault: false },
    });
    res.json({ success: true, data: { ...template, sections: JSON.parse(template.sections || '[]') } });
  });

  return router;
}
