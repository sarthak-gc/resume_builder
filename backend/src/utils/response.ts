import { Response } from "express";
import { StatusCode } from "./statusCodes";

const sendJsonResponse = (
  res: Response,
  statusCode: number = StatusCode.OK,
  success: boolean,
  message?: string,
  data?: any,
  error?: string
) => {
  res.status(statusCode).json({
    success,
    data,
    message,
    error,
  });
};

export default sendJsonResponse;
