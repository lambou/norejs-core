import { NextFunction, Request, Response } from "express";

export namespace Validator {
  export type DataOriginType = "query" | "body" | "params";
  export type FieldType =
    | "string"
    | "object"
    | "array"
    | "bool"
    | "date"
    | "timestamp"
    | "double"
    | "int"
    | "long"
    | "decimal";

  export interface RuleType {
    message?:
      | string
      | ((
          value: any,
          options: FieldValidationOptions,
          data: any
        ) => string | Promise<string>);
    validator: (
      value: any,
      options: FieldValidationOptions,
      data: any
    ) => Promise<boolean> | boolean;
  }

  export interface FieldValidationOptions {
    type: FieldType | [FieldType, string];
    required?: boolean | string;
    rules?: RuleType[];
  }

  export type ValidateOptions<BodyType = any> = {
    [key in keyof BodyType]: FieldValidationOptions;
  };

  export interface ValidationError {
    origin: DataOriginType;
    field: string;
    type: FieldType;
    value: any;
    message: string[];
  }

  export interface ValidationResult {
    message?: string;
    errors: ValidationError[];
  }

  /**
   * Validation middleware
   * @param origin data origin
   * @param options validation options
   */
  export function validateRequest<BodyType = any>(
    origin: DataOriginType,
    options: ValidateOptions<BodyType>
  ) {
    return async (request: Request, response: Response, next: NextFunction) => {
      // validate the request
      const validationResult = await validate(request, origin, options);

      // no errors
      if (validationResult.errors.length === 0) {
        return next();
      } else {
        return response.status(422).json(validationResult);
      }
    };
  }

  /**
   * Validate a request data
   *
   * @param request express request
   * @param origin data origin
   * @param options validation options
   */
  export async function validate<BodyType = any>(
    request: Request,
    origin: "query" | "body" | "params",
    options: ValidateOptions<BodyType>
  ): Promise<ValidationResult> {
    // load data
    const data = request[origin];

    // initialize error
    const result: ValidationResult = {
      errors: [],
    };

    /**
     * Add error in the result
     * @param error error payload
     */
    const addError = (error: ValidationError) => {
      var found = false;
      for (let index = 0; index < result.errors.length; index++) {
        const element = result.errors[index];
        if (error.field === element.field) {
          element.message.push(...error.message);
          found = true;
          break;
        }
      }
      if (!found) {
        result.errors.push(error);
      }
    };

    // browse fields
    for (const field of Object.keys(options)) {
      // load options
      const def: FieldValidationOptions = options[field];

      // load field type
      const fieldType = Array.isArray(def.type) ? def.type[0] : def.type;

      // load value
      const value = data[field];

      // is required
      const isRequired = ((): boolean => {
        if (typeof def.required === "boolean") {
          return def.required === true;
        } else if (typeof def.required === "string") {
          return true;
        }
      })();

      // field exists and has a value
      const valueFilled = ((): boolean => {
        if (value !== null && value !== undefined) {
          if (typeof value === "string") {
            return `${value}`.length !== 0;
          } else if (Array.isArray(value)) {
            return value.length !== 0;
          } else {
            return true;
          }
        } else {
          return false;
        }
      })();

      /**
       * Required Rule validation
       * --------------------------------------
       */
      if (isRequired) {
        // the field is no defined
        if (!valueFilled) {
          // add error
          addError({
            origin,
            field: field,
            type: fieldType,
            value: value,
            message: [
              typeof def.required === "string"
                ? def.required
                : `The field \`${field}\` is required`,
            ],
          });
        }
      }

      /**
       * Type validation
       * ---------------------------------------
       */

      // is empty or not defined
      const isEmpty = value === null || value === undefined;

      if (!isEmpty) {
        const typeErrorMessage = Array.isArray(def.type)
          ? def.type[1]
          : `The value of \`${field}\` must be a valid ${fieldType}`;

        switch (fieldType) {
          /**
           * string
           */
          case "string":
            if (typeof value !== "string") {
              addError({
                origin,
                field: field,
                type: fieldType,
                value: value,
                message: [typeErrorMessage],
              });
            }
            break;

          /**
           * array
           */
          case "array":
            if (!Array.isArray(value)) {
              addError({
                origin,
                field: field,
                type: fieldType,
                value,
                message: [typeErrorMessage],
              });
            }
            break;

          /**
           * boolean
           */
          case "bool":
            switch (origin) {
              case "query":
              case "params":
                if (
                  typeof value === "string" &&
                  value.length !== 0 &&
                  !["true", "false"].includes(value.toLowerCase())
                ) {
                  addError({
                    origin,
                    field: field,
                    type: fieldType,
                    value,
                    message: [typeErrorMessage],
                  });
                }
                break;

              case "body":
                if (typeof value !== "boolean") {
                  addError({
                    origin,
                    field: field,
                    type: fieldType,
                    value,
                    message: [typeErrorMessage],
                  });
                }
                break;
            }
            break;

          /**
           * date
           */
          case "date":
            try {
              const date = new Date(value);
              if (isNaN(date.getTime())) {
                throw {
                  message: typeErrorMessage,
                };
              }
            } catch (error) {
              addError({
                origin,
                field: field,
                type: fieldType,
                value,
                message: [typeErrorMessage],
              });
            }
            break;

          /**
           * Decimal types
           */
          case "decimal":
          case "double":
            try {
              parseFloat(value);
            } catch (error) {
              addError({
                origin,
                field: field,
                type: fieldType,
                value,
                message: [typeErrorMessage],
              });
            }
            break;

          /**
           * Integer
           */
          case "int":
          case "long":
          case "timestamp":
            try {
              parseInt(value);
            } catch (error) {
              addError({
                origin,
                field: field,
                type: fieldType,
                value,
                message: [typeErrorMessage],
              });
            }
            break;

          /**
           * Object
           */
          case "object":
            if (typeof value !== "object") {
              addError({
                origin,
                field: field,
                type: fieldType,
                value,
                message: [typeErrorMessage],
              });
            }
            break;

          default:
            break;
        }
      }

      if (isRequired || !isEmpty) {
        /**
         * Rules validation
         */
        for (const rule of def.rules ?? []) {
          if (!(await rule.validator(value, def, data))) {
            const errorMessage = rule.message
              ? typeof rule.message === "string"
                ? rule.message
                : await rule.message(value, def, data)
              : `\`${field}\` value is not valid`;
            addError({
              origin,
              field: field,
              type: fieldType,
              value,
              message: [errorMessage],
            });
          }
        }
      }
    }

    return {
      message: result.errors
        .map((error) => {
          return error.message.join("; ");
        })
        .join("; "),
      errors: result.errors,
    };
  }
}
