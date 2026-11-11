package com.sebaka.emailcode.api;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

class EmailCodeExceptionHandlerTest {

    @Test
    void returnsGenericBadGatewayWhenMailDeliveryFails() {
        EmailCodeExceptionHandler handler = new EmailCodeExceptionHandler();

        ProblemDetail response = handler.handleMailException(new MailSendException("SMTP unavailable"));

        assertThat(response.getStatus()).isEqualTo(HttpStatus.BAD_GATEWAY.value());
        assertThat(response.getDetail()).isEqualTo(
                "The verification email could not be sent. Please try again later."
        );
    }
}
