package jspack;

public interface IPackToOneChecker {
	void check(String dir);
	
	void addNeedPackHandlder(INeedPackHandler handler);
	
	void handle();
	
	void dispose();
}
