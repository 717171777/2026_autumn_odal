import { z } from "zod";
import { COLORS } from "./types";
export const uuid = z.uuid();
const realDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      value >= "1900-01-01" &&
      value <= "2200-12-31"
    );
  });
export const checklist = z
  .array(
    z.object({
      id: uuid,
      title: z.string().trim().min(1).max(200),
      done: z.boolean(),
    }),
  )
  .max(50)
  .refine((items) => new Set(items.map((i) => i.id)).size === items.length);
export const taskInput = z
  .object({
    title: z.string().trim().min(1).max(300),
    notes: z.string().max(10000).default(""),
    project_id: uuid.nullable().default(null),
    due_date: realDate.nullable().default(null),
    priority: z.number().int().min(0).max(3).default(0),
    recurrence: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
    checklist: checklist.default([]),
  })
  .strict()
  .refine((v) => v.recurrence === "none" || v.due_date !== null, {
    message: "반복할 기한을 지정해주세요.",
    path: ["due_date"],
  });
export const projectInput = z
  .object({
    name: z.string().trim().min(1).max(60),
    color: z.enum(COLORS).default("orange"),
  })
  .strict();
export const credentials = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(10).max(128),
    name: z.string().trim().min(1).max(50).optional(),
  })
  .strict();
