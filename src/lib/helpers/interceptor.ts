import { Response } from 'express';

/**
 * Intercept the express.Response.send method, so you can insert your own functionality when the send request is invoked.
 *
 * Source: http://stackoverflow.com/questions/33732509/express-js-how-to-intercept-response-send-response-json
 * Answer: http://stackoverflow.com/a/33735452/319711
 * @param {Response} res
 * @param {(body: { [key: string]: any }) => void} callback
 */
export const sendInterceptor = (res: Response, callback: (body: { [key: string]: any }) => void) => {
    const oldSend = res.send;
    res.send = function () {
        const body = JSON.parse(arguments[0]);
        callback(body);
        return oldSend.apply(res, arguments);
    };
};
