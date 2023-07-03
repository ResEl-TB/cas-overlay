package org.apereo.cas.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
//import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import com.connect_group.thymeleaf_extras.ThymeleafExtrasDialect;

import org.apereo.cas.configuration.CasConfigurationProperties;

@Configuration(value = "CasOverlayOverrideConfiguration", proxyBeanMethods = false)
//@AutoConfiguration
//@EnableConfigurationProperties(CasConfigurationProperties.class)
public class CasOverlayOverrideConfiguration {
    @Bean
    public ThymeleafExtrasDialect thymeleafExtrasDialect() {
        return new ThymeleafExtrasDialect();
    }
}
