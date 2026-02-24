const cloudinary = require('../config/cloudinary');

const uploadContractPDF = (fileBuffer, folder = 'gan-contracts') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: 'raw',
                format: 'pdf'
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id
                });
            }
        );

        uploadStream.end(fileBuffer);
    });
};

const deleteContractPDF = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'raw'
        });
        return { success: result.result === 'ok' };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

module.exports = { uploadContractPDF, deleteContractPDF };
