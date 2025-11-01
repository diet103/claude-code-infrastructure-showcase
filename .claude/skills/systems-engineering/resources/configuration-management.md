# Configuration Management

Comprehensive guide to configuration management tools including Ansible, Chef, and Puppet with production-ready playbooks, cookbooks, and manifests for infrastructure automation.

## Table of Contents

- [Configuration Management Overview](#configuration-management-overview)
- [Ansible](#ansible)
- [Chef](#chef)
- [Puppet](#puppet)
- [Idempotency Patterns](#idempotency-patterns)
- [Testing Infrastructure Code](#testing-infrastructure-code)
- [Version Control Strategies](#version-control-strategies)
- [Best Practices](#best-practices)

## Configuration Management Overview

### Why Configuration Management?

```
Benefits:
✓ Infrastructure as Code
✓ Reproducibility
✓ Version control
✓ Automated deployments
✓ Consistency across environments
✓ Disaster recovery
✓ Documentation (code is documentation)
```

### Tool Comparison

| Feature | Ansible | Chef | Puppet |
|---------|---------|------|--------|
| **Architecture** | Agentless (SSH) | Agent-based | Agent-based |
| **Language** | YAML | Ruby DSL | Declarative DSL |
| **Learning Curve** | Low | Medium | Medium-High |
| **Execution** | Push model | Pull model | Pull model |
| **Best For** | Quick automation | Large infrastructures | Compliance |

## Ansible

### Directory Structure

```
ansible/
├── ansible.cfg                    # Ansible configuration
├── inventory/
│   ├── production/
│   │   ├── hosts                  # Inventory file
│   │   └── group_vars/
│   │       ├── all.yml           # Variables for all hosts
│   │       ├── webservers.yml    # Web server vars
│   │       └── databases.yml     # Database vars
│   └── staging/
│       ├── hosts
│       └── group_vars/
├── roles/
│   ├── common/                    # Base configuration
│   │   ├── tasks/
│   │   │   └── main.yml
│   │   ├── handlers/
│   │   │   └── main.yml
│   │   ├── templates/
│   │   ├── files/
│   │   ├── vars/
│   │   │   └── main.yml
│   │   ├── defaults/
│   │   │   └── main.yml
│   │   └── meta/
│   │       └── main.yml
│   ├── nginx/
│   ├── postgresql/
│   └── application/
├── playbooks/
│   ├── site.yml                   # Master playbook
│   ├── webservers.yml
│   ├── databases.yml
│   └── deploy.yml
├── group_vars/
│   └── all.yml
└── host_vars/
    └── server1.yml
```

### Ansible Configuration

```ini
# ansible.cfg
[defaults]
inventory = inventory/production/hosts
remote_user = ansible
host_key_checking = False
retry_files_enabled = False
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 86400

# Logging
log_path = /var/log/ansible.log

# SSH
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
pipelining = True
```

### Inventory File

```ini
# inventory/production/hosts

[webservers]
web1.example.com ansible_host=192.168.1.101
web2.example.com ansible_host=192.168.1.102
web3.example.com ansible_host=192.168.1.103

[databases]
db1.example.com ansible_host=192.168.1.111 postgresql_role=primary
db2.example.com ansible_host=192.168.1.112 postgresql_role=replica

[loadbalancers]
lb1.example.com ansible_host=192.168.1.201

[production:children]
webservers
databases
loadbalancers

[production:vars]
env=production
```

### Role: Common (Base Configuration)

```yaml
# roles/common/tasks/main.yml
---
- name: Update apt cache
  apt:
    update_cache: yes
    cache_valid_time: 3600
  when: ansible_os_family == "Debian"

- name: Install common packages
  apt:
    name:
      - vim
      - git
      - htop
      - curl
      - wget
      - unzip
      - net-tools
    state: present

- name: Configure timezone
  timezone:
    name: "{{ timezone | default('UTC') }}"

- name: Set hostname
  hostname:
    name: "{{ inventory_hostname }}"

- name: Configure NTP
  include_tasks: ntp.yml

- name: Configure firewall
  include_tasks: firewall.yml

- name: Create admin users
  user:
    name: "{{ item.username }}"
    groups: "{{ item.groups }}"
    shell: /bin/bash
    create_home: yes
  loop: "{{ admin_users }}"

- name: Add SSH keys for admin users
  authorized_key:
    user: "{{ item.username }}"
    key: "{{ item.ssh_key }}"
    state: present
  loop: "{{ admin_users }}"

- name: Configure sudoers
  template:
    src: sudoers.j2
    dest: /etc/sudoers.d/admins
    mode: '0440'
    validate: 'visudo -cf %s'
```

### Role: Nginx Web Server

```yaml
# roles/nginx/tasks/main.yml
---
- name: Install nginx
  apt:
    name: nginx
    state: present

- name: Create nginx directories
  file:
    path: "{{ item }}"
    state: directory
    owner: www-data
    group: www-data
    mode: '0755'
  loop:
    - /var/www/{{ app_name }}
    - /var/log/nginx/{{ app_name }}

- name: Configure nginx site
  template:
    src: nginx-site.conf.j2
    dest: /etc/nginx/sites-available/{{ app_name }}
    owner: root
    group: root
    mode: '0644'
  notify: Reload nginx

- name: Enable nginx site
  file:
    src: /etc/nginx/sites-available/{{ app_name }}
    dest: /etc/nginx/sites-enabled/{{ app_name }}
    state: link
  notify: Reload nginx

- name: Remove default nginx site
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: Reload nginx

- name: Configure nginx.conf
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: '0644'
  notify: Reload nginx

- name: Ensure nginx is started and enabled
  systemd:
    name: nginx
    state: started
    enabled: yes

- name: Configure log rotation
  template:
    src: logrotate.j2
    dest: /etc/logrotate.d/nginx-{{ app_name }}
    owner: root
    group: root
    mode: '0644'
```

```yaml
# roles/nginx/handlers/main.yml
---
- name: Reload nginx
  systemd:
    name: nginx
    state: reloaded

- name: Restart nginx
  systemd:
    name: nginx
    state: restarted
```

```jinja2
# roles/nginx/templates/nginx-site.conf.j2
upstream {{ app_name }}_backend {
    {% for server in backend_servers %}
    server {{ server.host }}:{{ server.port }} weight={{ server.weight | default(1) }};
    {% endfor %}
}

server {
    listen 80;
    server_name {{ server_name }};

    {% if ssl_enabled %}
    listen 443 ssl http2;
    ssl_certificate {{ ssl_cert_path }};
    ssl_certificate_key {{ ssl_key_path }};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    {% endif %}

    access_log /var/log/nginx/{{ app_name }}/access.log;
    error_log /var/log/nginx/{{ app_name }}/error.log;

    location / {
        proxy_pass http://{{ app_name }}_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /static {
        alias /var/www/{{ app_name }}/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Complete Playbook Example

```yaml
# playbooks/site.yml
---
- name: Configure all servers
  hosts: all
  become: yes
  roles:
    - common

- name: Configure web servers
  hosts: webservers
  become: yes
  vars:
    app_name: myapp
    server_name: example.com
    backend_servers:
      - { host: '127.0.0.1', port: 3000, weight: 1 }
  roles:
    - nginx
    - application

- name: Configure databases
  hosts: databases
  become: yes
  roles:
    - postgresql

- name: Configure load balancers
  hosts: loadbalancers
  become: yes
  roles:
    - haproxy
```

### Running Playbooks

```bash
# Syntax check
ansible-playbook playbooks/site.yml --syntax-check

# Dry run (check mode)
ansible-playbook playbooks/site.yml --check

# Run with diff output
ansible-playbook playbooks/site.yml --check --diff

# Run playbook
ansible-playbook playbooks/site.yml

# Run specific tags
ansible-playbook playbooks/site.yml --tags "nginx,application"

# Skip tags
ansible-playbook playbooks/site.yml --skip-tags "database"

# Limit to specific hosts
ansible-playbook playbooks/site.yml --limit webservers

# Verbose output
ansible-playbook playbooks/site.yml -v
ansible-playbook playbooks/site.yml -vvv  # Very verbose

# Use different inventory
ansible-playbook -i inventory/staging/hosts playbooks/site.yml
```

## Chef

### Repository Structure

```
chef-repo/
├── .chef/
│   ├── config.rb
│   └── credentials
├── cookbooks/
│   ├── myapp/
│   │   ├── attributes/
│   │   │   └── default.rb
│   │   ├── recipes/
│   │   │   ├── default.rb
│   │   │   └── nginx.rb
│   │   ├── templates/
│   │   │   └── default/
│   │   │       └── nginx.conf.erb
│   │   ├── files/
│   │   │   └── default/
│   │   ├── spec/
│   │   │   └── unit/
│   │   ├── test/
│   │   │   └── integration/
│   │   └── metadata.rb
├── roles/
│   ├── webserver.rb
│   └── database.rb
├── environments/
│   ├── production.rb
│   └── staging.rb
├── data_bags/
│   ├── users/
│   └── secrets/
└── Policyfile.rb
```

### Cookbook: Nginx

```ruby
# cookbooks/myapp/metadata.rb
name 'myapp'
maintainer 'Your Team'
maintainer_email 'team@example.com'
license 'Apache-2.0'
description 'Installs and configures myapp'
version '1.0.0'

depends 'nginx', '~> 10.0'
```

```ruby
# cookbooks/myapp/attributes/default.rb
default['myapp']['version'] = '1.0.0'
default['myapp']['port'] = 3000
default['myapp']['user'] = 'myapp'
default['myapp']['group'] = 'myapp'
default['myapp']['install_path'] = '/opt/myapp'

# Nginx configuration
default['myapp']['nginx']['server_name'] = 'example.com'
default['myapp']['nginx']['listen_port'] = 80
default['myapp']['nginx']['ssl_enabled'] = false
```

```ruby
# cookbooks/myapp/recipes/default.rb

# Create application user
user node['myapp']['user'] do
  system true
  shell '/bin/bash'
  home node['myapp']['install_path']
  action :create
end

# Create application directory
directory node['myapp']['install_path'] do
  owner node['myapp']['user']
  group node['myapp']['group']
  mode '0755'
  recursive true
  action :create
end

# Install application dependencies
package %w(git curl build-essential) do
  action :install
end

# Deploy application
git node['myapp']['install_path'] do
  repository node['myapp']['git_repo']
  revision node['myapp']['version']
  user node['myapp']['user']
  group node['myapp']['group']
  action :sync
  notifies :restart, 'systemd_unit[myapp.service]'
end

# Create systemd service
template '/etc/systemd/system/myapp.service' do
  source 'myapp.service.erb'
  owner 'root'
  group 'root'
  mode '0644'
  notifies :run, 'execute[systemctl-daemon-reload]', :immediately
end

execute 'systemctl-daemon-reload' do
  command 'systemctl daemon-reload'
  action :nothing
end

# Start and enable service
systemd_unit 'myapp.service' do
  action [:enable, :start]
end

# Include nginx recipe
include_recipe 'myapp::nginx'
```

```ruby
# cookbooks/myapp/recipes/nginx.rb

include_recipe 'nginx::default'

# Configure nginx site
template '/etc/nginx/sites-available/myapp' do
  source 'nginx.conf.erb'
  owner 'root'
  group 'root'
  mode '0644'
  variables(
    server_name: node['myapp']['nginx']['server_name'],
    port: node['myapp']['port'],
    app_path: node['myapp']['install_path']
  )
  notifies :reload, 'service[nginx]'
end

# Enable site
link '/etc/nginx/sites-enabled/myapp' do
  to '/etc/nginx/sites-available/myapp'
  notifies :reload, 'service[nginx]'
end

# Disable default site
file '/etc/nginx/sites-enabled/default' do
  action :delete
  notifies :reload, 'service[nginx]'
end

service 'nginx' do
  action [:enable, :start]
end
```

### Role Definition

```ruby
# roles/webserver.rb
name 'webserver'
description 'Web server role'

run_list(
  'recipe[myapp::default]',
  'recipe[myapp::nginx]'
)

default_attributes(
  'myapp' => {
    'version' => '1.0.0',
    'port' => 3000
  }
)

override_attributes(
  'nginx' => {
    'worker_processes' => 4
  }
)
```

### Bootstrap and Run

```bash
# Bootstrap node
knife bootstrap 192.168.1.101 \
  --ssh-user ubuntu \
  --sudo \
  --node-name web1 \
  --run-list 'role[webserver]'

# Upload cookbook
knife cookbook upload myapp

# Upload role
knife role from file roles/webserver.rb

# Run chef-client on node
knife ssh 'role:webserver' 'sudo chef-client' -x ubuntu
```

## Puppet

### Module Structure

```
modules/
└── myapp/
    ├── manifests/
    │   ├── init.pp
    │   ├── install.pp
    │   ├── config.pp
    │   └── service.pp
    ├── templates/
    │   ├── nginx.conf.erb
    │   └── myapp.service.erb
    ├── files/
    ├── spec/
    │   └── classes/
    │       └── init_spec.rb
    └── metadata.json
```

### Puppet Manifest

```puppet
# modules/myapp/manifests/init.pp
class myapp (
  String $version = '1.0.0',
  Integer $port = 3000,
  String $user = 'myapp',
  String $group = 'myapp',
  String $install_path = '/opt/myapp',
  String $git_repo = 'https://github.com/example/myapp.git',
) {
  contain myapp::install
  contain myapp::config
  contain myapp::service

  Class['myapp::install']
  -> Class['myapp::config']
  ~> Class['myapp::service']
}
```

```puppet
# modules/myapp/manifests/install.pp
class myapp::install {
  # Create user
  user { $myapp::user:
    ensure     => present,
    system     => true,
    shell      => '/bin/bash',
    home       => $myapp::install_path,
    managehome => true,
  }

  # Install packages
  package { ['git', 'curl', 'build-essential']:
    ensure => installed,
  }

  # Clone repository
  vcsrepo { $myapp::install_path:
    ensure   => present,
    provider => git,
    source   => $myapp::git_repo,
    revision => $myapp::version,
    user     => $myapp::user,
    require  => User[$myapp::user],
  }
}
```

```puppet
# modules/myapp/manifests/config.pp
class myapp::config {
  # Application configuration
  file { "${myapp::install_path}/config":
    ensure => directory,
    owner  => $myapp::user,
    group  => $myapp::group,
    mode   => '0755',
  }

  # Systemd service
  file { '/etc/systemd/system/myapp.service':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0644',
    content => template('myapp/myapp.service.erb'),
    notify  => Exec['systemctl-daemon-reload'],
  }

  exec { 'systemctl-daemon-reload':
    command     => '/bin/systemctl daemon-reload',
    refreshonly => true,
  }
}
```

```puppet
# modules/myapp/manifests/service.pp
class myapp::service {
  service { 'myapp':
    ensure     => running,
    enable     => true,
    hasrestart => true,
    hasstatus  => true,
    require    => File['/etc/systemd/system/myapp.service'],
  }
}
```

### Site Manifest

```puppet
# manifests/site.pp

# Default node configuration
node default {
  include common
}

# Web servers
node /^web\d+\.example\.com$/ {
  include common
  include myapp
  include nginx
}

# Database servers
node /^db\d+\.example\.com$/ {
  include common
  include postgresql
}
```

### Hiera Configuration

```yaml
# hiera.yaml
---
version: 5
defaults:
  datadir: data
  data_hash: yaml_data

hierarchy:
  - name: "Per-node data"
    path: "nodes/%{trusted.certname}.yaml"

  - name: "Per-environment data"
    path: "environments/%{environment}.yaml"

  - name: "Common data"
    path: "common.yaml"
```

```yaml
# data/common.yaml
---
myapp::version: '1.0.0'
myapp::port: 3000
myapp::git_repo: 'https://github.com/example/myapp.git'
```

## Idempotency Patterns

### Ansible Idempotency

```yaml
# BAD - Not idempotent
- name: Add line to file
  shell: echo "new line" >> /etc/myconfig

# GOOD - Idempotent
- name: Add line to file
  lineinfile:
    path: /etc/myconfig
    line: "new line"
    state: present

# BAD - Creates multiple cron entries
- name: Add cron job
  shell: echo "0 2 * * * /backup.sh" | crontab

# GOOD - Idempotent cron
- name: Add backup cron job
  cron:
    name: "Daily backup"
    hour: "2"
    minute: "0"
    job: "/backup.sh"
```

### Check Before Change Pattern

```yaml
# Ansible
- name: Check if service exists
  stat:
    path: /etc/systemd/system/myapp.service
  register: service_file

- name: Configure service
  template:
    src: myapp.service.j2
    dest: /etc/systemd/system/myapp.service
  when: not service_file.stat.exists or force_update
```

```ruby
# Chef
file '/etc/myapp/config.yml' do
  content lazy { generate_config }
  action :create
  not_if { ::File.exist?('/etc/myapp/config.yml') && !node['myapp']['force_update'] }
end
```

## Testing Infrastructure Code

### Ansible Testing

```bash
# Install testing tools
pip install ansible-lint molecule molecule-docker

# Lint playbook
ansible-lint playbooks/site.yml

# Syntax check
ansible-playbook playbooks/site.yml --syntax-check

# Molecule testing
cd roles/myapp
molecule init scenario
molecule test
```

```yaml
# molecule/default/molecule.yml
---
dependency:
  name: galaxy
driver:
  name: docker
platforms:
  - name: instance
    image: ubuntu:22.04
    pre_build_image: true
provisioner:
  name: ansible
verifier:
  name: ansible
```

### Chef Testing (Test Kitchen)

```yaml
# .kitchen.yml
---
driver:
  name: docker

provisioner:
  name: chef_zero

platforms:
  - name: ubuntu-22.04

suites:
  - name: default
    run_list:
      - recipe[myapp::default]
    attributes:
```

```bash
# Run tests
kitchen test

# Create instance
kitchen create

# Converge (apply cookbook)
kitchen converge

# Verify
kitchen verify

# Destroy
kitchen destroy
```

### Puppet Testing (rspec-puppet)

```ruby
# spec/classes/init_spec.rb
require 'spec_helper'

describe 'myapp' do
  on_supported_os.each do |os, facts|
    context "on #{os}" do
      let(:facts) { facts }

      it { is_expected.to compile.with_all_deps }
      it { is_expected.to contain_class('myapp::install') }
      it { is_expected.to contain_class('myapp::config') }
      it { is_expected.to contain_class('myapp::service') }

      it do
        is_expected.to contain_service('myapp')
          .with_ensure('running')
          .with_enable(true)
      end
    end
  end
end
```

```bash
# Run tests
bundle exec rake spec
```

## Version Control Strategies

### Git Workflow

```bash
# Repository structure
git-repo/
├── main (production)
├── staging
└── development

# Feature workflow
git checkout -b feature/new-role development
# Make changes
git add .
git commit -m "Add new role for application deployment"
git push origin feature/new-role
# Create pull request
# After review, merge to development
# Test in dev environment
# Merge to staging for QA
# Finally merge to main for production
```

### Environment Branches

```bash
# Ansible
ansible-playbook -i inventory/dev playbooks/site.yml
ansible-playbook -i inventory/staging playbooks/site.yml
ansible-playbook -i inventory/prod playbooks/site.yml

# Use environment-specific variables
group_vars/
├── dev/
│   └── all.yml
├── staging/
│   └── all.yml
└── prod/
    └── all.yml
```

## Best Practices

1. **Use Version Control:**
   - All configuration in Git
   - Tag releases
   - Document changes in commits
   - Use pull requests for review

2. **Test Before Production:**
   - Use linters (ansible-lint, foodcritic, puppet-lint)
   - Run in staging first
   - Automated testing (Molecule, Test Kitchen, rspec-puppet)
   - Dry run before applying

3. **Make Idempotent:**
   - Code should be safe to run multiple times
   - Check state before making changes
   - Use proper modules (not shell/exec)

4. **Security:**
   - Encrypt secrets (Ansible Vault, Chef encrypted data bags)
   - Don't commit credentials
   - Use SSH keys, not passwords
   - Audit changes

5. **Documentation:**
   - README for each role/cookbook
   - Variable documentation
   - Usage examples
   - Runbooks for operations

---

**Related Topics:**
- See [automation-patterns.md](automation-patterns.md) for automation best practices
- See [shell-scripting.md](shell-scripting.md) for scripting patterns
- See [linux-administration.md](linux-administration.md) for system management
