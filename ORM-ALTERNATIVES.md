# ORM 대안 (better-sqlite3)

better-sqlite3를 직접 사용하는 대신 ORM(Object-Relational Mapping)을 사용하면 데이터베이스 작업을 더 간편하게 할 수 있습니다. 다음은 better-sqlite3와 함께 사용할 수 있는 몇 가지 ORM 라이브러리입니다.

## 1. TypeORM

TypeORM은 TypeScript와 JavaScript(ES7, ES6, ES5) 모두를 지원하는 가장 인기 있는 ORM 중 하나입니다.

### 장점
- TypeScript와의 우수한 통합
- 엔티티 관계 관리 (1:1, 1:n, n:n)
- 마이그레이션 시스템
- 다양한 데이터베이스 지원 (SQLite 포함)
- 풍부한 쿼리 빌더
- 데코레이터 기반 또는 JavaScript로 작성 가능

### 설치
```bash
npm install typeorm reflect-metadata
```

### 사용 예시
```typescript
import "reflect-metadata";
import { DataSource } from "typeorm";
import { Entity, Column, PrimaryGeneratedColumn, Repository, DataSource } from "typeorm";

// 엔티티 정의
@Entity()
export class Nurse {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    employee_id: string;

    @Column({ nullable: true })
    department: string;

    @Column({ nullable: true })
    position: string;

    @Column({ nullable: true })
    contact: string;

    @Column()
    created_at: Date;

    @Column()
    updated_at: Date;
}

// 데이터베이스 연결
const AppDataSource = new DataSource({
    type: "better-sqlite3",
    database: "nurse-manager.db",
    synchronize: true,
    logging: true,
    entities: [Nurse],
});

// 저장소 사용하기
const nurseRepository: Repository<Nurse> = AppDataSource.getRepository(Nurse);

// 데이터 조회
const nurses = await nurseRepository.find();

// 데이터 추가
const nurse = new Nurse();
nurse.name = "홍길동";
nurse.employee_id = "N001";
nurse.department = "응급실";
await nurseRepository.save(nurse);
```

## 2. Sequelize

Sequelize는 Node.js 환경에서 가장 널리 사용되는 ORM 중 하나입니다.

### 장점
- 다양한 데이터베이스 지원 (SQLite 포함)
- 강력한 마이그레이션 기능
- 관계 정의 및 관리
- 트랜잭션 지원
- 데이터 유효성 검사

### 설치
```bash
npm install sequelize sequelize-typescript
```

### 사용 예시
```typescript
import { Sequelize, Model, DataTypes, Optional } from 'sequelize';

// 데이터베이스 연결
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'nurse-manager.db',
  logging: console.log
});

// 인터페이스 정의
interface NurseAttributes {
  id: number;
  name: string;
  employee_id: string;
  department?: string;
  position?: string;
  contact?: string;
  created_at?: Date;
  updated_at?: Date;
}

interface NurseCreationAttributes extends Optional<NurseAttributes, 'id' | 'created_at' | 'updated_at'> {}

// 모델 정의
class Nurse extends Model<NurseAttributes, NurseCreationAttributes> implements NurseAttributes {
  public id!: number;
  public name!: string;
  public employee_id!: string;
  public department?: string;
  public position?: string;
  public contact?: string;
  public created_at!: Date;
  public updated_at!: Date;
}

Nurse.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    employee_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    position: {
      type: DataTypes.STRING,
      allowNull: true
    },
    contact: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'nurses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
);

// 데이터 조회
const nurses = await Nurse.findAll();

// 데이터 추가
const nurse = await Nurse.create({
  name: '홍길동',
  employee_id: 'N001',
  department: '응급실'
});
```

## 3. Prisma

Prisma는 최신 Node.js 및 TypeScript ORM으로, 타입 안전성과 자동 생성된 클라이언트로 개발을 쉽게 만듭니다.

### 장점
- 타입 안전성이 매우 높음
- 직관적인 데이터 모델링
- 자동 생성된 클라이언트
- 강력한 마이그레이션 시스템
- 우수한 개발자 경험

### 설치
```bash
npm install prisma @prisma/client
npx prisma init
```

### 사용 예시
1. 먼저 schema.prisma 파일에 모델 정의:
```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = "file:./nurse-manager.db"
}

generator client {
  provider = "prisma-client-js"
}

model Nurse {
  id         Int       @id @default(autoincrement())
  name       String
  employee_id String   @unique
  department String?
  position   String?
  contact    String?
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  shifts     Shift[]
}

model Shift {
  id         Int      @id @default(autoincrement())
  nurse      Nurse    @relation(fields: [nurse_id], references: [id])
  nurse_id   Int
  shift_date String
  shift_type String
  status     String   @default("scheduled")
  notes      String?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
}
```

2. 모델 생성 및 사용:
```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 데이터 조회
const nurses = await prisma.nurse.findMany();

// 관계 데이터 포함 조회
const nursesWithShifts = await prisma.nurse.findMany({
  include: {
    shifts: true
  }
});

// 데이터 추가
const nurse = await prisma.nurse.create({
  data: {
    name: '홍길동',
    employee_id: 'N001',
    department: '응급실',
  }
});

// 관계 데이터 함께 추가
const nurseWithShift = await prisma.nurse.create({
  data: {
    name: '김간호',
    employee_id: 'N002',
    department: '소아과',
    shifts: {
      create: [
        {
          shift_date: '2023-11-01',
          shift_type: '주간',
          status: '예정'
        }
      ]
    }
  },
  include: {
    shifts: true
  }
});
```

## 4. knex.js + objection.js

knex는 쿼리 빌더이고 objection.js는 그 위에 구축된 ORM입니다.

### 장점
- SQL 쿼리에 대한 더 많은 제어
- 복잡한 조인 및 서브쿼리 지원
- 유연한 관계 정의
- 트랜잭션 지원

### 설치
```bash
npm install knex objection better-sqlite3
```

### 사용 예시
```typescript
import Knex from 'knex';
import { Model } from 'objection';

// 데이터베이스 연결
const knex = Knex({
  client: 'better-sqlite3',
  connection: {
    filename: 'nurse-manager.db'
  },
  useNullAsDefault: true
});

// objection에 knex 설정
Model.knex(knex);

// 모델 정의
class Nurse extends Model {
  static get tableName() {
    return 'nurses';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'employee_id'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        employee_id: { type: 'string', minLength: 1, maxLength: 50 },
        department: { type: ['string', 'null'], maxLength: 255 },
        position: { type: ['string', 'null'], maxLength: 255 },
        contact: { type: ['string', 'null'], maxLength: 255 },
        created_at: { type: 'string' },
        updated_at: { type: 'string' }
      }
    };
  }

  static get relationMappings() {
    return {
      shifts: {
        relation: Model.HasManyRelation,
        modelClass: Shift,
        join: {
          from: 'nurses.id',
          to: 'shifts.nurse_id'
        }
      }
    };
  }
}

class Shift extends Model {
  static get tableName() {
    return 'shifts';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['nurse_id', 'shift_date', 'shift_type'],
      properties: {
        id: { type: 'integer' },
        nurse_id: { type: 'integer' },
        shift_date: { type: 'string' },
        shift_type: { type: 'string' },
        status: { type: 'string', default: 'scheduled' },
        notes: { type: ['string', 'null'] },
        created_at: { type: 'string' },
        updated_at: { type: 'string' }
      }
    };
  }

  static get relationMappings() {
    return {
      nurse: {
        relation: Model.BelongsToOneRelation,
        modelClass: Nurse,
        join: {
          from: 'shifts.nurse_id',
          to: 'nurses.id'
        }
      }
    };
  }
}

// 데이터 조회
const nurses = await Nurse.query();

// 관계 데이터 포함 조회
const nursesWithShifts = await Nurse.query().withGraphFetched('shifts');

// 데이터 추가
const nurse = await Nurse.query().insert({
  name: '홍길동',
  employee_id: 'N001',
  department: '응급실'
});
```

## 권장사항

1. **소규모 프로젝트**: knex.js 또는 better-sqlite3를 직접 사용
2. **중규모 프로젝트**: Prisma 또는 TypeORM
3. **대규모 프로젝트**: TypeORM 또는 Sequelize

현재 이 프로젝트에 가장 적합한 옵션은 **Prisma** 또는 **TypeORM**입니다. 둘 다 TypeScript 지원이 우수하며, 모델링과 관계 관리가 간편합니다.

## 마이그레이션 방법

현재 better-sqlite3에서 ORM으로 마이그레이션하려면 다음 단계를 따르세요:

1. 선택한 ORM 설치 및 구성
2. 기존 데이터베이스 구조를 ORM의 스키마 또는 모델 정의로 변환
3. 기존 쿼리를 ORM API 호출로 대체
4. 애플리케이션 코드에서 데이터베이스 호출 부분 업데이트
5. 테스트 및 디버깅 