import { z } from 'zod';

export const successResponse = <T extends z.ZodType>(
  dataSchema: T,
  name?: string,
) => {
  const schema = z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
  });

  return name ? schema.openapi(name) : schema;
};

export const emptyDataSuccessResponseSchema = successResponse(
  z.null(),
  'EmptyDataSuccessResponse',
);

export const errorResponseSchema = z
  .object({
    success: z.literal(false),
    message: z.string(),
    errors: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        }),
      )
      .nullable(),
  })
  .openapi('ErrorResponse');
