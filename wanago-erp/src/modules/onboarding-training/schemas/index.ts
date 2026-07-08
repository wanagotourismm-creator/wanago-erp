import { z } from "zod";

export const trainingModuleSchema = z.object({
  title:       z.string().min(2, "Title is required").max(100),
  description: z.string().max(300).optional().or(z.literal("")),
});

export type TrainingModuleSchema = z.infer<typeof trainingModuleSchema>;

const quizOptionSchema = z.object({
  en: z.string().min(1, "Required"),
  ml: z.string().min(1, "Required"),
});

export const trainingStepSchema = z
  .object({
    targetPath:     z.string().min(1, "Target page path is required").regex(/^\//, "Must start with / (e.g. /leads)"),
    targetSelector: z.string().min(1, "Target element is required (e.g. a description or CSS selector)"),
    explanationEn:  z.string().min(1, "English explanation is required"),
    explanationMl:  z.string().min(1, "Malayalam explanation is required"),
    hasQuiz:        z.boolean().default(false),
    quizQuestionEn: z.string().optional().or(z.literal("")),
    quizQuestionMl: z.string().optional().or(z.literal("")),
    quizOptions:    z.array(quizOptionSchema).optional(),
    quizCorrectIndex: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.hasQuiz) return;
    if (!data.quizQuestionEn?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quizQuestionEn"], message: "Quiz question (English) is required" });
    }
    if (!data.quizQuestionMl?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quizQuestionMl"], message: "Quiz question (Malayalam) is required" });
    }
    if (!data.quizOptions || data.quizOptions.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quizOptions"], message: "At least 2 answer options are required" });
    }
    if (data.quizCorrectIndex == null || data.quizCorrectIndex < 0 || data.quizCorrectIndex >= (data.quizOptions?.length ?? 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quizCorrectIndex"], message: "Select which option is correct" });
    }
  });

export type TrainingStepSchema = z.infer<typeof trainingStepSchema>;
