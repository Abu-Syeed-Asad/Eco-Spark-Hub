import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { envVars } from "./env.config";
import { AppError } from "../error/errorHelpler/AppError";
import status from "http-status";

cloudinary.config({
  api_key: envVars.CLOUDINARY.CLOUDINARY_API_KEY,
  cloud_name: envVars.CLOUDINARY.CLOUDINARY_CLOUD_NAME,
  api_secret: envVars.CLOUDINARY.CLOUDINARY_API_SECRET,
});

export const uploadFileToCloudinary = async (
  fileBuffer: Buffer,
  fileName: string,
): Promise<UploadApiResponse> => {
  if (!fileBuffer || !fileName) {
    throw new AppError(
      status.BAD_REQUEST,
      "File buffer and file name are required for upload",
    );
  }
  const extention = fileName.split(".").pop()?.toLocaleLowerCase();
  const fileNameWithoutExtension = fileName
    .split(".")
    .slice(0, -1)
    .join(".")
    .toLowerCase()
    .replace(/\s+/g, "-")
    // eslint-disable-next-line no-useless-escape
    .replace(/[^a-z0-9\-]/g, "");

  const uniqueName =
    Math.random().toString(36).substring(2) +
    "_" +
    Date.now() +
    "_" +
    fileNameWithoutExtension;
  const folder = extention === "pdf" ? "pdfs" : "images";
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: "auto",
          public_id: `Eco-Speark-Hub/${folder}/${uniqueName}`,
          folder: `Eco-Speark-Hub/${folder}`,
        },
        (error, result) => {
          if (error) {
            return reject(
              new AppError(
                status.INTERNAL_SERVER_ERROR,
                "failde upload to cloudinary",
              ),
            );
          }
          resolve(result as UploadApiResponse);
        },
      )
      .end(fileBuffer);
  });
};

export const deletefileFromCloudinary = async (url: string) => {
  try {
    const regex = /\/v\d+\/(.+?)(?:\.[a-zA-Z0-9]+)+$/;
    const match = url.match(regex);
    if (match && match[1]) {
      const publicId = match[1];
      await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      });
      console.log(`File${publicId} deleted from cloudinary`);
    }
  } catch (error) {
    console.log("Error from cloudinary image distroy", error);
  }
};

export const cloudinaryUpload = cloudinary;
