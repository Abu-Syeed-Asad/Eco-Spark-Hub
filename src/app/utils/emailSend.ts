import nodemailer from "nodemailer";
import ejs from "ejs";
import { envVars } from "../config/env.config";
import path from "node:path";
import type { sendEmailOption } from "../interface/nodeMailer.interface";
import status from "http-status";
import { AppError } from "../error/errorHelpler/AppError";

const smtpPort = Number(envVars.EMAIL_SENDER.SMTP_PORT);

const transporter = nodemailer.createTransport({
  host: envVars.EMAIL_SENDER.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: envVars.EMAIL_SENDER.SMTP_USER,
    pass: envVars.EMAIL_SENDER.SMTP_PASS,
  },
});

export const sendEmail = async (payload: sendEmailOption) => {
  const { to, subject, templateData, templateName, attachments } = payload;
  try {
    const templatePath = path.resolve(
      process.cwd(),
      `src/app/templates/${templateName}.ejs`,
    );
    const html = await ejs.renderFile(templatePath, templateData);
    const info = await transporter.sendMail({
      from: envVars.EMAIL_SENDER.SMTP_FROM,
      to,
      subject,
      html,
      attachments: attachments?.map((attachment) => {
        return {
          filename: attachment.fileName,
          content: attachment.content,
          contentType: attachment.contentType,
        };
      }),
    });
    console.log(`email sent to ${to}:${info.messageId}`);
    return info;
  } catch (error) {
    console.error(error);
    throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to send email");
  }
};



