package com.maint.pm_backend.security;

import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final EmployeeRepository employeeRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        if (employee.getActive() != null && !employee.getActive()) {
            throw new UsernameNotFoundException("User is deactivated");
        }

        return new org.springframework.security.core.userdetails.User(
                employee.getEmail(),
                employee.getPassword() != null ? employee.getPassword() : "",
                new ArrayList<>() // Empty authorities for now, can map roles/permissions later
        );
    }
}
