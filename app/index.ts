import * as twilio from 'twilio';
import * as dotenv from 'dotenv';

dotenv.config();

const twilio_config = {
    account_sid: process.env.TWILIO_ACCOUNT_SID,
    auth_token: process.env.TWILIO_AUTH_TOKEN
};

const twilio_client = twilio(
    twilio_config.account_sid,
    twilio_config.auth_token
);

export const send = async () => {
    console.log('sending');

    const body = 'Glastonbury says Hello!';
    const from = '+447480803357';
    const to = '+447880880680';

    const message = {
        body,
        from,
        to
    };

    try {
        const response = await twilio_client.messages.create(message);

        console.log('message', response.status);
    } catch (error) {
        console.log(error);
    }
};
