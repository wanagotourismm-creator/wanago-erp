import { z } from "zod";

export const trainingModuleSchema = z.object({
  title:       z.string().min(2, "Title is required").max(100),
  description: z.string().max(300).optional().or(z.literal("")),
  mandatory:   z.boolean().default(false),
});

export type TrainingModuleSchema = z.infer<typeof trainingModuleSchema>;

const quizOptionSchema = z.object({
  en: z.string().min(1, "Required"),
  ml: z.string().min(1, "Required"),
});

const practiceFieldSchema = z.object({
  key:         z.string().min(1, "Required"),
  labelEn:     z.string().min(1, "Required"),
  labelMl:     z.string().min(1, "Required"),
  placeholder: z.string().optional().or(z.literal("")),
  type:        z.enum(["text", "textarea"]).default("text"),
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
    hasPracticeForm:      z.boolean().default(false),
    practiceTitleEn:      z.string().optional().or(z.literal("")),
    practiceTitleMl:      z.string().optional().or(z.literal("")),
    practiceSubmitLabelEn: z.string().optional().or(z.literal("")),
    practiceSubmitLabelMl: z.string().optional().or(z.literal("")),
    practiceFields:       z.array(practiceFieldSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasQuiz) {
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
    }
    if (data.hasPracticeForm) {
      if (!data.practiceTitleEn?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["practiceTitleEn"], message: "Practice form title (English) is required" });
      }
      if (!data.practiceFields || data.practiceFields.length < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["practiceFields"], message: "At least 1 field is required" });
      }
    }
  });

export type TrainingStepSchema = z.infer<typeof trainingStepSchema>;
