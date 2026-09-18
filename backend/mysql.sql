create database if not exists giranezahealth character set utf8mb4 collate utf8mb4_unicode_ci;
use giranezahealth;

create table if not exists health (
  id bigint unsigned not null auto_increment,
  name varchar(160) not null,
  status enum('ACTIVE', 'INACTIVE') not null default 'ACTIVE',
  notes text null,
  created_at timestamp not null default current_timestamp,
  primary key (id)
);