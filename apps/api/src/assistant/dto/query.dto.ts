import { IsOptional, IsString, MinLength } from 'class-validator';

export class AssistantQueryDto {
  @IsString()
  @MinLength(2)
  question: string;

  @IsOptional()
  @IsString()
  period?: string;
}
