package com.sebaka.emailcode.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.mail.MailException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class EmailCodeExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(EmailCodeExceptionHandler.class);

    @ExceptionHandler(MailException.class)
    public ProblemDetail handleMailException(MailException exception) {
        logger.error(
                "Could not send verification email. Check the SMTP host, port, credentials, TLS settings, and sender address.",
                exception
        );
        return ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_GATEWAY,
                "The verification email could not be sent. Please try again later."
        );
    }
}
