package com.sebaka.emailcode.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class EmailCodeServiceTest {

    @Test
    void sendsSixDigitCodeToRequestedEmail() {
        JavaMailSender mailSender = org.mockito.Mockito.mock(JavaMailSender.class);
        EmailCodeService service = new EmailCodeService(mailSender, "no-reply@example.com");

        service.sendCode("person@example.com");

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        SimpleMailMessage message = messageCaptor.getValue();

        assertThat(message.getTo()).containsExactly("person@example.com");
        assertThat(message.getFrom()).isEqualTo("no-reply@example.com");
        assertThat(message.getSubject()).isEqualTo("Your verification code");
        assertThat(message.getText()).matches("Your verification code is: \\d{6}");
    }
}
