import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import Joi from 'joi';

function createUSDTGateway() {
    const router = express.Router();

    // Helper function to generate MD5 signature
    function generateMD5Signature(params, secretKey) {
        const sortedParams = Object.keys(params)
            .filter(key => params[key] != null && params[key] !== "")
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');
        
        const dataToSign = sortedParams + '&key=' + secretKey;
        console.log('Data to Sign:', dataToSign);
        
        const sign = crypto.createHash('md5').update(dataToSign).digest('hex').toLowerCase();
        console.log('Generated Signature:', sign);
        
        return sign;
    }

    // Route to create the USDT collection order
    router.post('/create-collection-order', async (req, res) => {
        const schema = Joi.object({
            amount: Joi.number().required(),
            coinType: Joi.string().required(),
            merchantOrderNo: Joi.string().required(),
            callbackCurrencyCode: Joi.string().required(),
            notifyUrl: Joi.string().uri().required(),
            version: Joi.string().required(),
            language: Joi.string().required(),
            callbackExchangeRate: Joi.number().required(),
            memberNo: Joi.string().required(),
            signType: Joi.string().optional()
        });

        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { amount, coinType, merchantOrderNo, callbackCurrencyCode, notifyUrl, version, language, callbackExchangeRate, memberNo, signType } = req.body;
        const secretKey = "DtxLefYJm2EhFEoRHNC1K4CmdAjBwTjXXvgEjhLb";

        const params = {
            amount, 
            coinType,
            merchantId: "10136",
            merchantOrderNo,
            callbackCurrencyCode,
            notifyUrl,
            version,
            language,
            callbackExchangeRate,
            memberNo,
            signType: signType || 'MD5'
        };

        const signature = generateMD5Signature(params, secretKey);
        params.sign = signature;

        try {
            const response = await axios.post('https://gateway.bishengusdt.com/api/coin/payOrder/createCashier', params);
            return res.status(200).json(response.data);
        } catch (error) {
            console.log(error);
            if (error.response) {
                return res.status(500).json({ success: false, message: 'Unknown error', errorCode: 4, data: error.response.data });
            } else {
                return res.status(500).json({ success: false, message: 'Unknown error', errorCode: 4, data: error.message });
            }
        }
    });

    return router;
}

export default createUSDTGateway;