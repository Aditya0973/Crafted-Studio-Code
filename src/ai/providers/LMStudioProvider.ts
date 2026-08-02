import { OpenAIProvider } from './OpenAIProvider';
import { AIProviderId } from '../types';

export class LMStudioProvider extends OpenAIProvider {
  public override id: AIProviderId = 'lmstudio';
  public override name = 'LM Studio Local Server';

  constructor() {
    super();
    // @ts-ignore
    this.baseUrl = 'http://127.0.0.1:1234/v1';
  }

  public override async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // @ts-ignore
      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }
}
