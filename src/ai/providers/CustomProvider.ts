import { OpenAIProvider } from './OpenAIProvider';
import { AIProviderId } from '../types';

export class CustomProvider extends OpenAIProvider {
  public override id: AIProviderId = 'custom';
  public override name = 'Custom OpenAI-Compatible API';
}
