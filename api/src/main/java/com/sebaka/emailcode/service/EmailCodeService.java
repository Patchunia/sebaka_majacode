package com.sebaka.emailcode.service;

import java.security.SecureRandom;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailCodeService {

    private static final int CODE_BOUND = 1_000_000;

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final SecureRandom secureRandom = new SecureRandom();

    public EmailCodeService(
            JavaMailSender mailSender,
            @Value("${email.from}") String fromAddress
    ) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    public void sendCode(String email) {
        String code = "%06d".formatted(secureRandom.nextInt(CODE_BOUND));
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(email);
        message.setSubject("Your verification code");
        message.setText("Your verification code is: " + code);
        mailSender.send(message);
    }
}
